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
  const [customerDetails, setCustomerDetails] = useState({
    customerName: "",
    phone: "",
    deliveryAddress: "",
  });
  const [checkoutError, setCheckoutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

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

  const checkoutDisabled =
    cart.length === 0 ||
    !customerDetails.customerName.trim() ||
    !customerDetails.phone.trim() ||
    !customerDetails.deliveryAddress.trim() ||
    isSubmitting;

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
    setOrderConfirmation(null);
    setCheckoutError("");
  }

  function removeCartItem(itemId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== itemId),
    );
  }

  function handleCustomerDetailChange(event) {
    const { name, value } = event.target;

    setCustomerDetails((currentDetails) => ({
      ...currentDetails,
      [name]: value,
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (checkoutDisabled) {
      return;
    }

    setCheckoutError("");
    setIsSubmitting(true);

    const orderRequest = {
      customerName: customerDetails.customerName,
      phone: customerDetails.phone,
      deliveryAddress: customerDetails.deliveryAddress,
      pizzas: cart.map((item) => ({
        pizzaId: item.pizzaId,
        sizeId: item.sizeId,
        toppings: item.toppings.map((topping) => topping.id),
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderRequest),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "The order could not be created");
      }

      setOrderConfirmation(responseData);
      setCart([]);
      setCustomerDetails({
        customerName: "",
        phone: "",
        deliveryAddress: "",
      });
    } catch (error) {
      setCheckoutError(
        error instanceof TypeError
          ? "Could not connect to the server. Please try again."
          : error.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function findOrder(event) {
    event.preventDefault();

    const trimmedOrderId = lookupId.trim();

    if (!trimmedOrderId) {
      setLookupResult(null);
      setLookupError("Enter an order ID");
      return;
    }

    setLookupError("");
    setLookupResult(null);
    setIsLookingUp(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/${encodeURIComponent(trimmedOrderId)}`,
      );
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Order not found"
            : responseData.error || "The order could not be loaded",
        );
      }

      setLookupResult(responseData);
    } catch (error) {
      setLookupError(
        error instanceof TypeError
          ? "Could not connect to the server. Please try again."
          : error.message,
      );
    } finally {
      setIsLookingUp(false);
    }
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

            <form className="checkout-form" onSubmit={submitOrder}>
              <div className="checkout-heading">
                <p className="step-label">Step 3</p>
                <h2>Delivery details</h2>
              </div>

              <label className="input-field">
                <span>Customer name</span>
                <input
                  autoComplete="name"
                  name="customerName"
                  onChange={handleCustomerDetailChange}
                  placeholder="Your full name"
                  type="text"
                  value={customerDetails.customerName}
                />
              </label>

              <label className="input-field">
                <span>Phone</span>
                <input
                  autoComplete="tel"
                  name="phone"
                  onChange={handleCustomerDetailChange}
                  placeholder="050-0000000"
                  type="tel"
                  value={customerDetails.phone}
                />
              </label>

              <label className="input-field">
                <span>Delivery address</span>
                <textarea
                  autoComplete="street-address"
                  name="deliveryAddress"
                  onChange={handleCustomerDetailChange}
                  placeholder="Street, number, and city"
                  rows="3"
                  value={customerDetails.deliveryAddress}
                />
              </label>

              {checkoutError && (
                <p className="form-error" role="alert">
                  {checkoutError}
                </p>
              )}

              <button
                className="primary-button checkout-button"
                data-testid="checkout-button"
                disabled={checkoutDisabled}
                type="submit"
              >
                {isSubmitting
                  ? "Creating order..."
                  : `Simulate payment and order · ${formatPrice(cartTotal)}`}
              </button>
            </form>

            {orderConfirmation && (
              <section
                className="order-confirmation"
                data-testid="order-confirmation"
              >
                <p className="confirmation-label">Order confirmed</p>
                <h2>Thank you!</h2>
                <dl>
                  <div>
                    <dt>Order ID</dt>
                    <dd>{orderConfirmation.id}</dd>
                  </div>
                  <div>
                    <dt>Final price</dt>
                    <dd>{formatPrice(orderConfirmation.totalPrice)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd className="status-badge">
                      {orderConfirmation.status}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </aside>
        </div>
      )}

      <section className="tracking-panel">
        <div>
          <p className="eyebrow">Already ordered?</p>
          <h2>Track an order</h2>
          <p className="tracking-intro">
            Enter the order ID from your confirmation to see its current
            status.
          </p>
        </div>

        <form className="tracking-form" onSubmit={findOrder}>
          <label className="input-field" htmlFor="order-lookup-id">
            <span>Order ID</span>
            <input
              id="order-lookup-id"
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Paste an order ID"
              type="text"
              value={lookupId}
            />
          </label>
          <button
            className="secondary-button"
            disabled={isLookingUp}
            type="submit"
          >
            {isLookingUp ? "Searching..." : "Find order"}
          </button>
        </form>

        {lookupError && (
          <p className="form-error lookup-message" role="alert">
            {lookupError}
          </p>
        )}

        {lookupResult && (
          <article className="lookup-result">
            <div>
              <span>Order ID</span>
              <strong>{lookupResult.id}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{lookupResult.customerName}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatPrice(lookupResult.totalPrice)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className="status-badge">{lookupResult.status}</strong>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

export default App;
