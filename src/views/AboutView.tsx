import { useNavigate } from 'react-router-dom';
import '../style.css';

function AboutView() {
  const navigate = useNavigate();

  return (
    <div className="about-wrapper">
      <div className="about-container">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Tillbaka till startsidan
        </button>
        <section className="about-hero">
          <h1>Om oss</h1>
          <p>
            Välkommen till vår app för data-driven grocery optimization. Vi hjälper dig att jämföra priser från ICA, Coop, Willys och Hemköp för att optimera dina inköp.
          </p>
        </section>
        <section className="about-purpose">
          <h2>Vårt syfte</h2>
          <p>
            Automatiserad insamling från ledande svenska livsmedelskedjor. Jämför, bygg din matkasse och sluta gissa var det är billigast!
          </p>
        </section>
        <section className="about-contact">
          <h2>Kontaktinformation</h2>
          <p>
            Har du frågor eller feedback? Kontakta oss på:
          </p>
          <ul>
            <li>Email: info@example.com</li>
            <li>Telefon: 012-345 6789</li>
            <li>Adress: Stockholm, Sverige</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export { AboutView };