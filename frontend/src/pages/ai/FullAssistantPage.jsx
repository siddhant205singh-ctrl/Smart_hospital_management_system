import React from 'react';
import AssistantChatView from '../../components/chatbot/AssistantChatView';

export default function FullAssistantPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <AssistantChatView isWidget={false} />
    </div>
  );
}
