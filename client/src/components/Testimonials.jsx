import React from 'react';
import './Testimonials.css';

const testimonials = [
  {
    name: 'Dr. Anna Greig',
    title: 'Head of Nuclear Medicine Centers',
    role: 'Head of Nuclear Medicine Centers',
    roleClass: 'testimonial__role--doctor',
    text: `"I’m really impressed with DocTalk.ai. As a doctor, I’ve seen how AI can truly help with accurate diagnoses and better patient care. This platform offers reliable advice that benefits both patients and doctors alike."`,
  },
  {
    name: 'Jessica K.',
    title: 'User',
    role: 'User',
    roleClass: 'testimonial__role--user',
    text: `"Having DocTalk.ai feels like having a personal health helper with me all the time. It’s helped me make good choices for my family’s health. I’d recommend it to anyone who wants to take charge of their well-being."`,
  },
  {
    name: 'Michael B.',
    title: 'User',
    role: 'User',
    roleClass: 'testimonial__role--user',
    text: `"DocTalk.ai has changed how I take care of my health! It’s so convenient to get health information whenever I need it. The tips I’ve gotten have really helped me."`,
  },
];

const Testimonials = () => (
  <section className="testimonials">
    <h2 className="testimonials__heading">What our users say</h2>
    <p className="testimonials__subheading">
      Discover why thousands trust DocTalk.ai for their health needs.
    </p>
    <div className="testimonials__cards">
      {testimonials.map((t, i) => (
        <div className="testimonial__card" key={i}>
          <div className="testimonial__name">{t.name}</div>
          <div className={`testimonial__role ${t.roleClass}`}>{t.title}</div>
          <div className="testimonial__text">{t.text}</div>
        </div>
      ))}
    </div>
  </section>
);

export default Testimonials;
