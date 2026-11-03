const ApprovalRequest = require('../models/ApprovalRequest');
const VerificationDocument = require('../models/VerificationDocument');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const { logAudit } = require('../middleware/auditMiddleware');
const {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendApplicationInfoRequestedEmail
} = require('../services/emailService');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/approvals/pending
 * Retrieve pending/filtered approval requests based on reviewer role
 */
exports.getApprovalRequests = async (req, res, next) => {
  try {
    const reviewer = req.user;
    const { status = 'pending', role } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (reviewer.role === 'super_admin') {
      // Super admin reviews hospital admins
      filter.applicantRole = role || 'hospital_admin';
    } else if (reviewer.role === 'hospital_admin' || reviewer.role === 'admin') {
      // Hospital admin reviews doctors and blood officers affiliated with their hospital
      filter.hospitalId = reviewer.hospitalId;
      if (role) {
        filter.applicantRole = role;
      } else {
        filter.applicantRole = { $in: ['doctor', 'blood_bank_officer'] };
      }
    } else {
      return res.status(403).json({ error: 'You do not have permission to view verification approvals.' });
    }

    const requests = await ApprovalRequest.find(filter)
      .populate('applicantId', 'name email phone role status createdAt avatar')
      .populate('documentIds')
      .populate('hospitalId', 'name city state licenseNumber')
      .populate('reviewerId', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/approvals/:id
 * Retrieve a specific approval request with full documentation
 */
exports.getApprovalRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reviewer = req.user;

    const request = await ApprovalRequest.findById(id)
      .populate('applicantId', 'name email phone role status createdAt avatar')
      .populate('documentIds')
      .populate('hospitalId')
      .populate('reviewerId', 'name email role');

    if (!request) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    // Permission check
    if (reviewer.role === 'hospital_admin' || reviewer.role === 'admin') {
      if (String(request.hospitalId?._id || request.hospitalId) !== String(reviewer.hospitalId)) {
        return res.status(403).json({ error: 'Not authorized to review requests from other hospitals' });
      }
    }

    res.json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/approvals/document/:docId
 * Stream/serve verification document securely
 */
exports.streamVerificationDocument = async (req, res, next) => {
  try {
    const { docId } = req.params;
    const user = req.user;

    const doc = await VerificationDocument.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner, super_admin, or affiliated hospital_admin can view
    const isOwner = String(doc.userId) === String(user._id);
    const isSuperAdmin = user.role === 'super_admin';
    const isHospitalAdmin = user.role === 'hospital_admin' || user.role === 'admin';

    if (!isOwner && !isSuperAdmin && !isHospitalAdmin) {
      return res.status(403).json({ error: 'Not authorized to access this document' });
    }

    const fullPath = path.resolve(doc.filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Document file missing from server' });
    }

    res.setHeader('Content-Type', doc.fileMimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/approvals/:id/approve
 * Approve application -> activate account, set verification badge, notify
 */
exports.approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reviewer = req.user;

    const request = await ApprovalRequest.findById(id).populate('applicantId');
    if (!request) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ error: 'Request is already approved' });
    }

    const applicant = await User.findById(request.applicantId._id);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant user not found' });
    }

    // Update status
    request.status = 'approved';
    request.reviewerId = reviewer._id;
    request.reviewerRole = reviewer.role === 'super_admin' ? 'super_admin' : 'hospital_admin';
    request.reviewedAt = new Date();
    await request.save();

    // Mark applicant active
    applicant.status = 'active';
    applicant.rejectionReason = '';
    await applicant.save();

    // Update role specific models
    if (applicant.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { userId: applicant._id },
        { 
          $set: { 
            approvalStatus: 'approved',
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: reviewer._id
          } 
        }
      );
    } else if (applicant.role === 'hospital_admin') {
      if (request.hospitalId) {
        await Hospital.findByIdAndUpdate(request.hospitalId, {
          $set: {
            approvalStatus: 'approved',
            isVerified: true,
            approvedBy: reviewer._id
          },
          $addToSet: { adminUserIds: applicant._id }
        });
      }
    }

    // Send congratulatory activation email
    await sendApplicationApprovedEmail({
      to: applicant.email,
      name: applicant.name,
      role: applicant.role,
      loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
    });

    await logAudit({
      userId: reviewer._id,
      userName: reviewer.name,
      userRole: reviewer.role,
      action: 'APPROVAL_REQUEST_APPROVED',
      resourceType: 'ApprovalRequest',
      resourceId: request._id,
      details: { applicantEmail: applicant.email, applicantRole: applicant.role }
    });

    res.json({
      success: true,
      message: `Applicant ${applicant.name} (${applicant.role}) approved successfully. Account is now ACTIVE.`,
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/approvals/:id/reject
 * Reject application with detailed reason -> notify applicant
 */
exports.rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reviewer = req.user;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A clear rejection reason of at least 5 characters is required.' });
    }

    const request = await ApprovalRequest.findById(id).populate('applicantId');
    if (!request) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const applicant = await User.findById(request.applicantId._id);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant user not found' });
    }

    request.status = 'rejected';
    request.rejectionReason = reason.trim();
    request.reviewerId = reviewer._id;
    request.reviewerRole = reviewer.role === 'super_admin' ? 'super_admin' : 'hospital_admin';
    request.reviewedAt = new Date();
    await request.save();

    applicant.status = 'rejected';
    applicant.rejectionReason = reason.trim();
    await applicant.save();

    if (applicant.role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { userId: applicant._id },
        { $set: { approvalStatus: 'rejected' } }
      );
    }

    // Send rejection email with guidance
    await sendApplicationRejectedEmail({
      to: applicant.email,
      name: applicant.name,
      role: applicant.role,
      reason: reason.trim(),
      canResubmit: request.resubmissionCount < request.maxResubmissions
    });

    await logAudit({
      userId: reviewer._id,
      userName: reviewer.name,
      userRole: reviewer.role,
      action: 'APPROVAL_REQUEST_REJECTED',
      resourceType: 'ApprovalRequest',
      resourceId: request._id,
      details: { applicantEmail: applicant.email, reason }
    });

    res.json({
      success: true,
      message: 'Application rejected. Rejection reason has been communicated to the applicant.',
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/approvals/:id/request-info
 * Request additional information / documentation from applicant
 */
exports.requestMoreInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const reviewer = req.user;

    if (!comments || comments.trim().length < 5) {
      return res.status(400).json({ error: 'Comments detailing what information or document is requested are required.' });
    }

    const request = await ApprovalRequest.findById(id).populate('applicantId');
    if (!request) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const applicant = await User.findById(request.applicantId._id);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant user not found' });
    }

    request.status = 'info_requested';
    request.requestedInfoComments = comments.trim();
    request.reviewerId = reviewer._id;
    request.reviewedAt = new Date();
    await request.save();

    applicant.rejectionReason = `Information Requested: ${comments.trim()}`;
    await applicant.save();

    // Dispatch email
    await sendApplicationInfoRequestedEmail({
      to: applicant.email,
      name: applicant.name,
      role: applicant.role,
      comments: comments.trim()
    });

    await logAudit({
      userId: reviewer._id,
      userName: reviewer.name,
      userRole: reviewer.role,
      action: 'APPROVAL_REQUEST_INFO_REQUESTED',
      resourceType: 'ApprovalRequest',
      resourceId: request._id,
      details: { applicantEmail: applicant.email, comments }
    });

    res.json({
      success: true,
      message: 'Clarification request sent to applicant.',
      request
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/approvals/resubmit
 * Allow applicant to re-upload documents or clarify details
 */
exports.resubmitApplication = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Applicant email is required for resubmission.' });
    }

    const applicant = await User.findOne({ email: email.toLowerCase().trim() });
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant account not found.' });
    }

    const request = await ApprovalRequest.findOne({ applicantId: applicant._id }).sort({ createdAt: -1 });
    if (!request) {
      return res.status(404).json({ error: 'No active approval request found.' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ error: 'This application is already approved.' });
    }

    if (request.resubmissionCount >= request.maxResubmissions) {
      return res.status(400).json({
        error: `Maximum resubmission limit (${request.maxResubmissions}) exceeded. Please contact platform administration.`
      });
    }

    // Process newly uploaded files if any
    const files = req.files || {};
    const newDocIds = [];

    const fileKeys = [
      'gov_photo_id',
      'medical_degree',
      'council_registration_cert',
      'hospital_license',
      'authorization_letter',
      'qualification_proof'
    ];

    for (const key of fileKeys) {
      if (files[key] && files[key][0]) {
        const file = files[key][0];
        const doc = await VerificationDocument.create({
          userId: applicant._id,
          role: applicant.role,
          documentType: key,
          fileName: file.originalname,
          filePath: file.path,
          fileMimeType: file.mimetype,
          fileSizeBytes: file.size,
          status: 'pending'
        });
        newDocIds.push(doc._id);
      }
    }

    if (newDocIds.length > 0) {
      request.documentIds.push(...newDocIds);
    }

    request.status = 'pending';
    request.resubmissionCount += 1;
    request.rejectionReason = '';
    request.requestedInfoComments = '';
    await request.save();

    applicant.status = 'pending_approval';
    applicant.rejectionReason = '';
    await applicant.save();

    res.json({
      success: true,
      message: 'Application details resubmitted successfully. Our team will review your updated records.',
      resubmissionCount: request.resubmissionCount,
      remainingResubmissions: request.maxResubmissions - request.resubmissionCount
    });
  } catch (error) {
    next(error);
  }
};
