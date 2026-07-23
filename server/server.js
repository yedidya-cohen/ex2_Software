const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

const menu = {
  pizzas: [
    { id: "margherita", name: "Margherita", price: 35 },
    { id: "vegetarian", name: "Vegetarian", price: 39 },
    { id: "pepperoni", name: "Pepperoni", price: 42 },
  ],
  sizes: [
    { id: "small", name: "Small", price: 0 },
    { id: "medium", name: "Medium", price: 8 },
    { id: "large", name: "Large", price: 15 },
  ],
  toppings: [
    { id: "olives", name: "Olives", price: 4 },
    { id: "mushrooms", name: "Mushrooms", price: 4 },
    { id: "corn", name: "Corn", price: 4 },
    { id: "onion", name: "Onion", price: 4.5 },
    { id: "extra-cheese", name: "Extra Cheese", price: 3.5 },
    { id: "pineapple", name: "Pineapple", price: 5 },
  ],
};

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Pizza ordering server is running" });
});

app.get("/api/menu", (req, res) => {
  res.json(menu);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
