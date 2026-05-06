import { useNavigate } from 'react-router-dom';
import '../style.css';

function AboutView() {
  const navigate = useNavigate();

  return (
    <div className="about-wrapper">
      <div className="about-container">
        <button className="btn-primary" onClick={() => navigate('/')}>
          ← Tillbaka till startsidan
        </button>
        
        <section className="about-hero">
          <h1>Om Matjakt</h1>
          <p>
            Välkommen till vår app för data-driven grocery optimization! Vi hjälper dig att jämföra priser från Sveriges butiker för att optimera dina inköp. 
          </p>
        </section>

        <section className="about-purpose">
          <h2>Vårt syfte</h2>
          <p>
            Under de senaste åren har inflationen lett till kraftigt ökade matpriser i Sverige. {' '}
            <a href='https://www.scb.se/pressmeddelande/matpriserna-steg-nagot-2024/' target='_blank'>Enligt SCB ökade livsmedelspriserna med 18,6 % under 2022 och ligger kvar på en hög nivå. </a>
            Det har därför blivit allt viktigare för kunder att enkelt kunna överblicka och jämföra aktuella priser!
          </p>
          <p>
            Vårt mål är att öka pristransparensen på matvarumarknaden, och göra så konsumenter slutar behöva gissa var det är billigast!
          </p>
        </section>

        <section className="about-contact">
          <h2>Kontakt</h2>
          <ul>
            <li>Adam Östberg — adamostb@kth.se</li>
            <li>Gustav Lundborg — glundbo@kth.se</li>
            <li>Rasmus Nordahl — rnordahl@kth.se</li>
            <li>Christopher Massi — cmassi@kth.se</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export { AboutView };