import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:3001/api";

function formatPrice(price) {
  return `₪${Number(price).toFixed(2).replace(/\.00$/, "")}`;
}

function App() {
  const [menu, setMenu] = useState(null);
  const [menuError, setMenuError] = useState("");
  const [selectedPizzaId, setSelectedPizzaId] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [selectedToppingIds, setSelectedToppingIds] = useState([]);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch(`${API_BASE_URL}/menu`);

        if (!response.ok) {
          throw new Error("The menu could not be loaded");
        }

        const menuData = await response.json();
        setMenu(menuData);
        setSelectedPizzaId(menuData.pizzas[0]?.id || "");
        setSelectedSizeId(menuData.sizes[0]?.id || "");
      } catch (error) {
        setMenuError(error.message);
      }
    }

    loadMenu();
  }, []);

  const selectedPizza = menu?.pizzas.find(
    (pizza) => pizza.id === selectedPizzaId,
  );
  const selectedSize = menu?.sizes.find((size) => size.id === selectedSizeId);
  const selectedToppings =
    menu?.toppings.filter((topping) =>
      selectedToppingIds.includes(topping.id),
    ) || [];

  const estimatedItemPrice = useMemo(() => {
    if (!selectedPizza || !selectedSize) {
      return 0;
    }

    const toppingsPrice = selectedToppings.reduce(
      (sum, topping) => sum + topping.price,
      0,
    );

    return selectedPizza.price + selectedSize.price + toppingsPrice;
  }, [selectedPizza, selectedSize, selectedToppings]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.itemPrice, 0),
    [cart],
  );

  function handlePizzaChange(pizzaId) {
    setSelectedPizzaId(pizzaId);
    setSelectionMessage("");

    if (pizzaId === "pepperoni" && selectedToppingIds.includes("corn")) {
      setSelectedToppingIds((currentIds) =>
        currentIds.filter((toppingId) => toppingId !== "corn"),
      );
      setSelectionMessage(
        "Corn was removed because Pepperoni cannot contain Corn.",
      );
    }
  }

  function handleToppingChange(toppingId) {
    setSelectionMessage("");

    if (selectedToppingIds.includes(toppingId)) {
      setSelectedToppingIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== toppingId),
      );
      return;
    }

    if (selectedPizzaId === "pepperoni" && toppingId === "corn") {
      setSelectionMessage("Pepperoni pizza cannot contain Corn.");
      return;
    }

    if (selectedToppingIds.length === 3) {
      setSelectionMessage("Choose no more than three toppings.");
      return;
    }

    setSelectedToppingIds((currentIds) => [...currentIds, toppingId]);
  }

  function addPizzaToCart() {
    if (!selectedPizza || !selectedSize) {
      return;
    }

    const cartItem = {
      id: crypto.randomUUID(),
      pizzaId: selectedPizza.id,
      pizzaName: selectedPizza.name,
      sizeId: selectedSize.id,
      sizeName: selectedSize.name,
      toppings: selectedToppings.map((topping) => ({
        id: topping.id,
        name: topping.name,
      })),
      itemPrice: estimatedItemPrice,
    };

    setCart((currentCart) => [...currentCart, cartItem]);
    setSelectedToppingIds([]);
    setSelectionMessage(`${selectedPizza.name} was added to the cart.`);
  }

  function removeCartItem(itemId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== itemId),
    );
  }

  return (
    <main className="app">
      <header className="page-header">
        <p className="eyebrow">Fresh from the oven</p>
        <h1>Pizza Ordering System</h1>
        <p className="intro">
          Choose a pizza, select a size, and add up to three toppings.
        </p>
      </header>

      {menuError && (
        <p className="alert alert-error" role="alert">
          {menuError}. Make sure the server is running and try again.
        </p>
      )}

      {!menu && !menuError && (
        <p className="alert" role="status">
          Loading menu...
        </p>
      )}

      {menu && (
        <div className="ordering-layout">
          <section className="menu-panel" data-testid="menu-list">
            <div className="section-heading">
              <div>
                <p className="step-label">Step 1</p>
                <h2>Build your pizza</h2>
              </div>
              <span className="item-estimate">
                {formatPrice(estimatedItemPrice)}
              </span>
            </div>

            <fieldset className="option-group">
              <legend>Pizza</legend>
              <div className="pizza-options">
                {menu.pizzas.map((pizza) => (
                  <label
                    className={`pizza-option ${
                      selectedPizzaId === pizza.id ? "selected" : ""
                    }`}
                    key={pizza.id}
                  >
                    <input
                      checked={selectedPizzaId === pizza.id}
                      name="pizza"
                      onChange={() => handlePizzaChange(pizza.id)}
                      type="radio"
                      value={pizza.id}
                    />
                    <span>
                      <strong>{pizza.name}</strong>
                      <small>{formatPrice(pizza.price)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="option-group">
              <label className="field-label" htmlFor="pizza-size">
                Size
              </label>
              <select
                id="pizza-size"
                onChange={(event) => setSelectedSizeId(event.target.value)}
                value={selectedSizeId}
              >
                {menu.sizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}{" "}
                    {size.price === 0
                      ? "(included)"
                      : `(+${formatPrice(size.price)})`}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="option-group">
              <legend>Toppings</legend>
              <p className="field-hint">Choose up to three.</p>
              <div className="topping-options">
                {menu.toppings.map((topping) => {
                  const isSelected = selectedToppingIds.includes(topping.id);
                  const conflictsWithPepperoni =
                    selectedPizzaId === "pepperoni" && topping.id === "corn";
                  const reachedLimit =
                    selectedToppingIds.length === 3 && !isSelected;

                  return (
                    <label
                      className={`topping-option ${
                        isSelected ? "selected" : ""
                      }`}
                      key={topping.id}
                    >
                      <input
                        checked={isSelected}
                        disabled={conflictsWithPepperoni || reachedLimit}
                        onChange={() => handleToppingChange(topping.id)}
                        type="checkbox"
                      />
                      <span>{topping.name}</span>
                      <small>+{formatPrice(topping.price)}</small>
                    </label>
                  );
                })}
              </div>
              {selectedPizzaId === "pepperoni" && (
                <p className="rule-note">Corn is unavailable for Pepperoni.</p>
              )}
            </fieldset>

            <p className="selection-message" aria-live="polite">
              {selectionMessage}
            </p>

            <button
              className="primary-button"
              onClick={addPizzaToCart}
              type="button"
            >
              Add pizza to cart · {formatPrice(estimatedItemPrice)}
            </button>
          </section>

          <aside className="cart-panel">
            <div className="section-heading">
              <div>
                <p className="step-label">Step 2</p>
                <h2>Your cart</h2>
              </div>
              <span className="cart-count">{cart.length}</span>
            </div>

            <div className="cart-items" data-testid="cart">
              {cart.length === 0 ? (
                <p className="empty-cart">
                  Your cart is empty. Add your first pizza.
                </p>
              ) : (
                cart.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <div>
                      <h3>{item.pizzaName}</h3>
                      <p>{item.sizeName}</p>
                      <p>
                        {item.toppings.length > 0
                          ? item.toppings
                              .map((topping) => topping.name)
                              .join(", ")
                          : "No toppings"}
                      </p>
                    </div>
                    <div className="cart-item-actions">
                      <strong>{formatPrice(item.itemPrice)}</strong>
                      <button
                        className="remove-button"
                        onClick={() => removeCartItem(item.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div
              className="order-summary"
              data-testid="order-summary-panel"
            >
              <span>Estimated total</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </div>
            <p className="summary-note">
              The server will calculate the final price at checkout.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default App;
