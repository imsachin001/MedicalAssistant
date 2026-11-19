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
        <div className="home__card-title">Knowledge at Your Fingertips</div>
        <div className="home__card-text">
          Explore information about diseases, health conditions, and medicines through a conversational interface. Ask questions naturally instead of manually searching through lengthy medical documents.
        </div>
      </div>
      <div className="home__card">
        <div className="home__card-title">Grounded in Medical References</div>
        <div className="home__card-text">
          The chatbot retrieves relevant passages from its medical document collection and provides them as context to an AI language model before generating a response.
        </div>
      </div>
    </div>
    <button className="home__try-btn" onClick={onTryNow}>Try now</button>
    <Testimonials />
    <FAQ />
    <footer className="home__footer">
      <div className="home__disclaimer">
        <strong>Medical Disclaimer</strong>
        <p>
          This application provides AI-generated educational information based on retrieved medical reference documents. It may contain inaccurate or incomplete information. It is not intended to diagnose, treat, or prevent any disease, and should not replace advice from a qualified healthcare professional. Do not use it for emergencies.
        </p>
      </div>
    </footer>
  </div>
);

export default Home;
