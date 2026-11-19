import React from 'react';
import './Testimonials.css';

const steps = [
  {
    number: '01',
    title: 'Document Processing',
    text: 'Extract and split medical PDF content into chunks.',
  },
  {
    number: '02',
    title: 'Embeddings',
    text: 'Generate vector representations using Sentence Transformers.',
  },
  {
    number: '03',
    title: 'Vector Search',
    text: 'Store and retrieve relevant chunks using Pinecone.',
  },
  {
    number: '04',
    title: 'AI Responses',
    text: 'Use retrieved context to generate answers with an LLM.',
  },
];

const Testimonials = () => (
  <section className="testimonials">
    <h2 className="testimonials__heading">How DocTalk.ai Works</h2>
    <p className="testimonials__subheading">
      A Retrieval-Augmented Generation (RAG) pipeline connects medical documents with conversational AI.
    </p>
    <div className="testimonials__cards">
      {steps.map((step) => (
        <div className="testimonial__card" key={step.number}>
          <div className="testimonial__name">{step.number}</div>
          <div className="testimonial__role">{step.title}</div>
          <div className="testimonial__text">{step.text}</div>
        </div>
      ))}
    </div>
  </section>
);

export default Testimonials;
