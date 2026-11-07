require('dotenv').config();
const { runAgentTurn } = require('../services/aiAgentEngine');

async function testGeneralQuestions() {
  console.log('Testing general questions with HealthMS AI & Gemini 3.5 Flash Lite...\n');

  // Test 1: General Science/Medical question
  const r1 = await runAgentTurn({
    message: 'What causes diabetes and how is it managed?',
    user: null,
    role: 'visitor',
    language: 'en'
  });
  console.log('Q1: What causes diabetes?');
  console.log('A1:', r1.reply.slice(0, 200).replace(/\n/g, ' '), '...\n');

  // Test 2: Conversational question
  const r2 = await runAgentTurn({
    message: 'Can you tell me a funny joke?',
    user: null,
    role: 'visitor',
    language: 'en'
  });
  console.log('Q2: Can you tell me a funny joke?');
  console.log('A2:', r2.reply.slice(0, 150).replace(/\n/g, ' '), '...\n');

  // Test 3: Logged in patient question (Ensure no repeated sign-in nagging)
  const testPatient = {
    _id: '65b1234567890abcdef12345',
    name: 'Rahul Sharma',
    role: 'patient',
    privacySettings: { useHealthDataInAssistant: true }
  };
  const r3 = await runAgentTurn({
    message: 'What is the normal blood pressure range?',
    user: testPatient,
    role: 'patient',
    language: 'en'
  });
  console.log('Q3: What is the normal blood pressure range?');
  console.log('A3:', r3.reply.slice(0, 200).replace(/\n/g, ' '), '...\n');
}

testGeneralQuestions();
