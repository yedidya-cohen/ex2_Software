const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");

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

const orders = [];
const validOrderStatuses = ["new", "preparing", "ready", "delivered"];
const nextOrderStatus = {
  new: "preparing",
  preparing: "ready",
  ready: "delivered",
};

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Pizza ordering server is running" });
});

app.get("/api/menu", (req, res) => {
  res.json(menu);
});

app.post("/api/orders", (req, res) => {
  if (
    req.body === null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  const { customerName, phone, deliveryAddress, pizzas } = req.body;

  if (typeof customerName !== "string" || customerName.trim() === "") {
    return res.status(400).json({ error: "Customer name is required" });
  }

  if (typeof phone !== "string" || phone.trim() === "") {
    return res.status(400).json({ error: "Phone is required" });
  }

  if (
    typeof deliveryAddress !== "string" ||
    deliveryAddress.trim() === ""
  ) {
    return res.status(400).json({ error: "Delivery address is required" });
  }

  if (!Array.isArray(pizzas) || pizzas.length === 0) {
    return res
      .status(400)
      .json({ error: "At least one pizza is required" });
  }

  const orderPizzas = [];

  for (let index = 0; index < pizzas.length; index += 1) {
    const selectedPizza = pizzas[index];

    if (
      selectedPizza === null ||
      typeof selectedPizza !== "object" ||
      Array.isArray(selectedPizza)
    ) {
      return res
        .status(400)
        .json({ error: `Pizza at index ${index} must be an object` });
    }

    const pizza = menu.pizzas.find(
      (menuPizza) => menuPizza.id === selectedPizza.pizzaId,
    );

    if (!pizza) {
      return res
        .status(400)
        .json({ error: `Pizza at index ${index} has an invalid pizzaId` });
    }

    const size = menu.sizes.find(
      (menuSize) => menuSize.id === selectedPizza.sizeId,
    );

    if (!size) {
      return res
        .status(400)
        .json({ error: `Pizza at index ${index} has an invalid sizeId` });
    }

    if (!Array.isArray(selectedPizza.toppings)) {
      return res.status(400).json({
        error: `Pizza at index ${index} must include a toppings array`,
      });
    }

    if (selectedPizza.toppings.length > 3) {
      return res.status(400).json({
        error: `Pizza at index ${index} cannot contain more than three toppings`,
      });
    }

    const selectedToppings = [];

    for (const toppingId of selectedPizza.toppings) {
      const topping = menu.toppings.find(
        (menuTopping) => menuTopping.id === toppingId,
      );

      if (!topping) {
        return res.status(400).json({
          error: `Pizza at index ${index} contains an invalid topping`,
        });
      }

      selectedToppings.push(topping);
    }

    if (
      pizza.id === "pepperoni" &&
      selectedToppings.some((topping) => topping.id === "corn")
    ) {
      return res.status(400).json({
        error: "Pepperoni pizza cannot contain Corn",
      });
    }

    const toppingsPrice = selectedToppings.reduce(
      (sum, topping) => sum + topping.price,
      0,
    );
    const itemPrice = Number(
      (pizza.price + size.price + toppingsPrice).toFixed(2),
    );

    orderPizzas.push({
      pizzaId: pizza.id,
      pizzaName: pizza.name,
      basePrice: pizza.price,
      sizeId: size.id,
      sizeName: size.name,
      sizePrice: size.price,
      toppings: selectedToppings.map((topping) => ({
        id: topping.id,
        name: topping.name,
        price: topping.price,
      })),
      itemPrice,
    });
  }

  const totalPrice = Number(
    orderPizzas
      .reduce((sum, selectedPizza) => sum + selectedPizza.itemPrice, 0)
      .toFixed(2),
  );

  const order = {
    id: randomUUID(),
    customerName: customerName.trim(),
    phone: phone.trim(),
    deliveryAddress: deliveryAddress.trim(),
    pizzas: orderPizzas,
    totalPrice,
    status: "new",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
  };

  orders.push(order);

  return res.status(201).json(order);
});

app.get("/api/orders", (req, res) => {
  const { status } = req.query;

  if (status === undefined) {
    return res.json(orders);
  }

  if (!validOrderStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid order status" });
  }

  return res.json(orders.filter((order) => order.status === status));
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find((storedOrder) => storedOrder.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  return res.json(order);
});

app.patch("/api/orders/:id/status", (req, res) => {
  if (
    req.body === null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  const { status } = req.body;

  if (status === undefined) {
    return res.status(400).json({ error: "Status is required" });
  }

  if (!validOrderStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid order status" });
  }

  const order = orders.find((storedOrder) => storedOrder.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (nextOrderStatus[order.status] !== status) {
    return res.status(409).json({
      error: `Illegal status transition from ${order.status} to ${status}`,
    });
  }

  order.status = status;

  return res.json(order);
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: "Request body must contain valid JSON" });
  }

  return next(error);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
