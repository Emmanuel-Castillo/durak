import Card from "./Card";

function Hand({ cards }) {
  return (
    <div>
      <h2>Your Cards:</h2>
      <div
        style={{position: "relative" }}
      >
        {cards.map((card, index) => (
          <div style={{position: "absolute", left: 1}}>
            <Card card={card} key={index} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Hand;
