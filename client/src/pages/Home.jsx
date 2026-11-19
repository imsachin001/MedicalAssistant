import React from 'react';
import './Home.css';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';

const Home = ({ onTryNow }) => (
  <div className="home">
    <h1 className="home__heading">Welcome to</h1>
    <div className="home__gradient">your AI Health Chat</div>
    <div className="home__cards">
      <div className="home__card">
        <div className="home__card-title">Revolutionary Product</div>
        <div className="home__card-subtitle">Your Personal AI Health Assistant, 24/7.</div>
        <div className="home__card-text">
          Skip the wait for appointments and stop searching symptoms online. Our AI health assistance chat offers instant, accurate symptom checking, personalized recommendations for medical tests, and detailed treatment plans – all created and validated by our team of experienced doctors and engineers.
        </div>
      </div>
      <div className="home__card">
        <div className="home__card-title">AI Validated by Doctors</div>
        <div className="home__card-subtitle">Machine Learning Meets Medicine.</div>
        <div className="home__card-text">
          Our chatbot uses LLMs fine-tuned on real medical data, patient-doctor conversations, and medical protocols. Our custom-built AI system understands your symptoms and provides accurate, up-to-date medical advice. Every recommendation, treatment plan, and test is validated by medical professionals to ensure it meets clinical standards.
        </div>
      </div>
    </div>
    <button className="home__try-btn" onClick={onTryNow}>Try now</button>
  <Testimonials />
  <FAQ />
  </div>
);

export default Home;
