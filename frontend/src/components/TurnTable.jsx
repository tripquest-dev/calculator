import React, { useState, useEffect, useRef } from "react";
const CircuitUtils = {
  drawConnections(canvas, connections, components) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    Object.entries(connections).forEach(([wireId, pinId]) => {
      const wire = components.wires.find((w) => w.id === wireId);
      const pin = components.pins.find((p) => p.id === pinId);
      if (wire && pin) {
        const startRect = document
          .getElementById(wireId)
          .getBoundingClientRect();
        const endRect = document
          .querySelector(`[data-id="${pinId}"]`)
          .getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const startX = startRect.left + 8 - canvasRect.left;
        const startY = startRect.top + 8 - canvasRect.top;
        const endX = endRect.left + 8 - canvasRect.left;
        const endY = endRect.top + 8 - canvasRect.top;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = "green";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
  },

  validateConnections(userConnections, correctConnections) {
    return Object.keys(correctConnections).every(
      (key) => userConnections[key] === correctConnections[key]
    );
  },

  animateConnection(startX, startY, endX, endY, ctx, duration = 500) {
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + (endX - startX) * eased,
        startY + (endY - startY) * eased
      );
      ctx.strokeStyle = "green";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  },
};

const CircuitBoard = ({ lessonData }) => {
  const { correctConnections, components } = lessonData;
  const [connections, setConnections] = useState({});
  const [selectedWire, setSelectedWire] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    CircuitUtils.drawConnections(canvasRef.current, connections, components);
  }, [connections, components]);

  const handleWireClick = (wireId) => {
    setSelectedWire(wireId);
  };

  const handlePinClick = (pinId) => {
    if (!selectedWire) return alert("Click on a sensor pin first!");
    setConnections((prev) => ({ ...prev, [selectedWire]: pinId }));
    setSelectedWire(null);
  };

  const checkConnections = () => {
    const isCorrect = CircuitUtils.validateConnections(
      connections,
      correctConnections
    );
    alert(
      isCorrect
        ? "✅ Correct connections!"
        : "❌ Some connections are incorrect. Try again."
    );
  };

  const resetConnections = () => {
    setConnections({});
  };

  return (
    <div className="circuit-board">
      <h1>{lessonData.title}</h1>
      <p>{lessonData.description}</p>
      <div className="circuit-area">
        <canvas
          ref={canvasRef}
          width="600"
          height="400"
          style={{ border: "1px solid #2196F3" }}
        />
        <div className="components">
          {components.wires.map((wire) => (
            <div
              key={wire.id}
              id={wire.id}
              className="wire"
              onClick={() => handleWireClick(wire.id)}
              style={{
                backgroundColor:
                  selectedWire === wire.id ? "#FFCA28" : "#2196F3",
                ...wire.style,
              }}
            >
              {wire.label}
            </div>
          ))}
          {components.pins.map((pin) => (
            <div
              key={pin.id}
              className="pin"
              data-id={pin.id}
              onClick={() => handlePinClick(pin.id)}
              style={{ backgroundColor: "#00BCD4", ...pin.style }}
            >
              {pin.label}
            </div>
          ))}
        </div>
      </div>
      <div className="controls">
        <button
          onClick={checkConnections}
          style={{ backgroundColor: "#FFCA28" }}
        >
          Check
        </button>
        <button
          onClick={resetConnections}
          style={{ backgroundColor: "#FFCA28" }}
        >
          Reset
        </button>
      </div>
      <div className="info">Connections: {Object.keys(connections).length}</div>
    </div>
  );
};

export default CircuitBoard;
