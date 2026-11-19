import React, { useState } from 'react';
import './FAQ.css';

const faqs = [
  {
    question: 'What is DocTalk.ai?',
    answer:
      'DocTalk.ai is an AI-powered health assistant designed to provide personalized medical information and support. It allows you to ask questions about symptoms, medications, lifestyle tips, and more. With advanced AI technology, DocTalk.ai offers instant responses to help you make informed decisions about your health.',
  },
  {
    question: 'How do I get started with DocTalk.ai?',
    answer:
      'Select Sign In and continue with your Google account. Once signed in, you can start chatting with the MediQuery AI health assistant.',
  },
  {
    question: 'What kind of health issues can DocTalk.ai help with?',
    answer:
      'DocTalk.ai can assist with a wide range of health-related questions, from common symptoms and minor ailments to chronic condition management. Whether you’re curious about a rash, need advice on managing stress, or have questions about medications, our AI assistant is here to help.',
  },
  {
    question: 'Is my data safe with DocTalk.ai?',
    answer:
      'Yes, your privacy and data security are our top priorities. All conversations are encrypted and handled according to strict privacy standards.',
  },
  {
    question: 'Can DocTalk.ai replace a doctor?',
    answer:
      'DocTalk.ai is designed to provide helpful information and support, but it does not replace professional medical advice, diagnosis, or treatment. Always consult a healthcare provider for serious concerns.',
  },
  {
    question: 'Does DocTalk.ai support emergency situations?',
    answer:
      'No, DocTalk.ai is not intended for emergency use. If you have a medical emergency, please contact emergency services or visit the nearest hospital.',
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = idx => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="faq">
      <h2 className="faq__heading">Have questions? We've got answers</h2>
      <p className="faq__subheading">Discover More About DocTalk.ai</p>
      <div className="faq__cards">
        {faqs.map((faq, idx) => (
          <div className="faq__card" key={idx}>
            <div className="faq__qrow" onClick={() => toggle(idx)}>
              <div className="faq__question">{faq.question}</div>
              <div className="faq__toggle">{openIndex === idx ? '–' : '+'}</div>
            </div>
            {openIndex === idx && (
              <div className="faq__answer">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
