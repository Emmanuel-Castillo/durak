import Card from "./Card";

function Hand({cards}) {
  return (
    <div>
      <h2>Your Cards:</h2>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {cards.map((card, index) => (
          <Card card={card} key={index}/>
        ))}
      </div>
    </div>
  );
}

export default Hand