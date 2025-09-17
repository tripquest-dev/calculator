import React, { useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";

const EditSafariItinerary = () => {
  // State for file input and dynamic data
  const [file, setFile] = useState(null);
  const [newAdults, setNewAdults] = useState(3); // Example metric to change

  // Handle file input change
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Function to generate edited PDF
  const generateEditedPDF = async () => {
    if (!file) {
      alert("Please upload a PDF file first!");
      return;
    }

    // Read the uploaded PDF file
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const pdfDoc = await PDFDocument.load(fileReader.result);

      // Get the page where the metric needs to be updated (e.g., Page 2 based on your document)
      const pages = pdfDoc.getPages();
      const targetPage = pages[1]; // Page 2 (index 1)

      // Update the "Guests" metric (adjust x, y coordinates based on your PDF layout)
      // Original text is "2 Adults" on Page 2; we'll replace or overlay it
      targetPage.drawText(`${newAdults} Adults`, {
        x: 50, // Adjust x coordinate to align with original text
        y: 690, // Adjust y coordinate to align with original text (from bottom)
        size: 12,
        color: rgb(0, 0, 0),
      });

      // Serialize the PDF document to bytes
      const pdfBytes = await pdfDoc.save();

      // Create a Blob and trigger download
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "edited_safari_itinerary.pdf";
      link.click();
    };
    fileReader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Edit Safari Itinerary PDF</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <div style={{ marginTop: "10px" }}>
        <label>Number of Adults: </label>
        <input
          type="number"
          value={newAdults}
          onChange={(e) => setNewAdults(parseInt(e.target.value))}
          min="0"
        />
      </div>
      <button
        onClick={generateEditedPDF}
        style={{ marginTop: "10px", padding: "5px 10px" }}
      >
        Download Edited PDF
      </button>
    </div>
  );
};

export default EditSafariItinerary;
