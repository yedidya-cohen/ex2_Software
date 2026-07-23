const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Pizza ordering server is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
