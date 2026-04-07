(function () {
  "use strict";

  const STORAGE_KEY = "fake-menu-checkout-state";
  const defaultMenu = [
    { id: "item-burger", name: "Classic Burger", category: "Main dish", price: 8.5 },
    { id: "item-fries", name: "Crispy Fries", category: "Side", price: 3.25 },
    { id: "item-soda", name: "Sparkling Soda", category: "Drink", price: 2.75 },
  ];

  const menuForm = document.getElementById("menuForm");
  const itemNameInput = document.getElementById("itemName");
  const itemCategoryInput = document.getElementById("itemCategory");
  const itemPriceInput = document.getElementById("itemPrice");
  const menuList = document.getElementById("menuList");
  const orderList = document.getElementById("orderList");
  const menuCount = document.getElementById("menuCount");
  const orderCount = document.getElementById("orderCount");
  const orderTotal = document.getElementById("orderTotal");
  const summaryTotal = document.getElementById("summaryTotal");
  const heroBalance = document.getElementById("heroBalance");
  const walletBalance = document.getElementById("walletBalance");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const clearOrderBtn = document.getElementById("clearOrderBtn");
  const resetBalanceBtn = document.getElementById("resetBalanceBtn");
  const statusMessage = document.getElementById("statusMessage");

  const state = loadState();

  function loadState() {
    try {
      const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!savedState || !Array.isArray(savedState.menu)) {
        throw new Error("Missing saved state.");
      }

      return {
        menu: savedState.menu
          .filter(isValidMenuItem)
          .map((item) => ({
            id: item.id,
            name: item.name.trim(),
            category: typeof item.category === "string" ? item.category.trim() : "",
            price: Number(item.price),
          })),
        order: sanitizeOrder(savedState.order),
        balance: Number.isFinite(Number(savedState.balance)) ? Number(savedState.balance) : 0,
      };
    } catch (error) {
      return {
        menu: defaultMenu.slice(),
        order: {},
        balance: 0,
      };
    }
  }

  function isValidMenuItem(item) {
    return Boolean(
      item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      item.name.trim() &&
      Number.isFinite(Number(item.price)) &&
      Number(item.price) > 0
    );
  }

  function sanitizeOrder(order) {
    const cleanOrder = {};

    if (!order || typeof order !== "object") {
      return cleanOrder;
    }

    Object.keys(order).forEach((itemId) => {
      const quantity = Number(order[itemId]);
      if (Number.isInteger(quantity) && quantity > 0) {
        cleanOrder[itemId] = quantity;
      }
    });

    return cleanOrder;
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        menu: state.menu,
        order: state.order,
        balance: state.balance,
      })
    );
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (typeof text === "string") {
      element.textContent = text;
    }
    return element;
  }

  function getMenuItem(itemId) {
    return state.menu.find((item) => item.id === itemId) || null;
  }

  function getOrderEntries() {
    return Object.keys(state.order)
      .map((itemId) => {
        const item = getMenuItem(itemId);
        if (!item) {
          delete state.order[itemId];
          return null;
        }

        return {
          item: item,
          quantity: state.order[itemId],
          lineTotal: item.price * state.order[itemId],
        };
      })
      .filter(Boolean);
  }

  function getOrderTotals() {
    const entries = getOrderEntries();
    const itemCount = entries.reduce(function (sum, entry) {
      return sum + entry.quantity;
    }, 0);
    const total = entries.reduce(function (sum, entry) {
      return sum + entry.lineTotal;
    }, 0);

    return {
      entries: entries,
      itemCount: itemCount,
      total: total,
    };
  }

  function setStatus(message) {
    statusMessage.textContent = message;
  }

  function renderMenu() {
    menuList.textContent = "";

    if (!state.menu.length) {
      const emptyState = createElement("div", "empty-state");
      emptyState.appendChild(createElement("strong", "", "No menu items yet"));
      emptyState.appendChild(createElement("p", "", "Add your first item to start taking orders."));
      menuList.appendChild(emptyState);
      return;
    }

    state.menu.forEach((item) => {
      const card = createElement("article", "menu-card");
      const info = createElement("div", "menu-card-info");
      const topRow = createElement("div", "menu-card-top");
      const price = createElement("strong", "menu-price", formatCurrency(item.price));
      const name = createElement("h3", "", item.name);

      topRow.appendChild(name);
      topRow.appendChild(price);
      info.appendChild(topRow);

      const meta = item.category ? item.category : "Uncategorized";
      info.appendChild(createElement("p", "menu-category", meta));

      const actions = createElement("div", "menu-actions");
      const addButton = createElement("button", "small-primary-btn", "Add to order");
      addButton.type = "button";
      addButton.addEventListener("click", function () {
        addToOrder(item.id);
      });

      const removeButton = createElement("button", "small-ghost-btn", "Remove");
      removeButton.type = "button";
      removeButton.addEventListener("click", function () {
        removeMenuItem(item.id);
      });

      actions.appendChild(addButton);
      actions.appendChild(removeButton);
      card.appendChild(info);
      card.appendChild(actions);
      menuList.appendChild(card);
    });
  }

  function renderOrder() {
    const totals = getOrderTotals();
    orderList.textContent = "";

    if (!totals.entries.length) {
      const emptyState = createElement("div", "empty-state");
      emptyState.appendChild(createElement("strong", "", "No items in the order"));
      emptyState.appendChild(createElement("p", "", "Add anything from your menu to build the customer order."));
      orderList.appendChild(emptyState);
    } else {
      totals.entries.forEach((entry) => {
        const orderItem = createElement("article", "order-card");
        const details = createElement("div", "order-details");
        const titleRow = createElement("div", "order-title-row");

        titleRow.appendChild(createElement("h3", "", entry.item.name));
        titleRow.appendChild(createElement("strong", "", formatCurrency(entry.lineTotal)));

        details.appendChild(titleRow);
        details.appendChild(
          createElement(
            "p",
            "menu-category",
            entry.item.category ? entry.item.category + " • " + formatCurrency(entry.item.price) + " each" : formatCurrency(entry.item.price) + " each"
          )
        );

        const controls = createElement("div", "quantity-controls");
        const decreaseButton = createElement("button", "qty-btn", "−");
        decreaseButton.type = "button";
        decreaseButton.setAttribute("aria-label", "Decrease quantity for " + entry.item.name);
        decreaseButton.addEventListener("click", function () {
          changeQuantity(entry.item.id, -1);
        });

        const quantity = createElement("span", "qty-value", String(entry.quantity));

        const increaseButton = createElement("button", "qty-btn", "+");
        increaseButton.type = "button";
        increaseButton.setAttribute("aria-label", "Increase quantity for " + entry.item.name);
        increaseButton.addEventListener("click", function () {
          changeQuantity(entry.item.id, 1);
        });

        const removeButton = createElement("button", "link-btn", "Remove");
        removeButton.type = "button";
        removeButton.addEventListener("click", function () {
          delete state.order[entry.item.id];
          persistAndRender();
          setStatus(entry.item.name + " removed from the order.");
        });

        controls.appendChild(decreaseButton);
        controls.appendChild(quantity);
        controls.appendChild(increaseButton);
        controls.appendChild(removeButton);

        orderItem.appendChild(details);
        orderItem.appendChild(controls);
        orderList.appendChild(orderItem);
      });
    }

    menuCount.textContent = String(state.menu.length);
    orderCount.textContent = String(totals.itemCount);
    orderTotal.textContent = formatCurrency(totals.total);
    summaryTotal.textContent = formatCurrency(totals.total);
    heroBalance.textContent = formatCurrency(state.balance);
    walletBalance.textContent = formatCurrency(state.balance);
    checkoutBtn.disabled = totals.total <= 0;
    clearOrderBtn.disabled = totals.total <= 0;
  }

  function persistAndRender() {
    saveState();
    renderMenu();
    renderOrder();
  }

  function addToOrder(itemId) {
    state.order[itemId] = (state.order[itemId] || 0) + 1;
    persistAndRender();

    const item = getMenuItem(itemId);
    if (item) {
      setStatus(item.name + " added to the order.");
    }
  }

  function changeQuantity(itemId, amount) {
    const nextQuantity = (state.order[itemId] || 0) + amount;

    if (nextQuantity <= 0) {
      delete state.order[itemId];
    } else {
      state.order[itemId] = nextQuantity;
    }

    persistAndRender();
  }

  function removeMenuItem(itemId) {
    const item = getMenuItem(itemId);
    state.menu = state.menu.filter(function (menuItem) {
      return menuItem.id !== itemId;
    });
    delete state.order[itemId];
    persistAndRender();

    if (item) {
      setStatus(item.name + " removed from the menu.");
    }
  }

  menuForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = itemNameInput.value.trim();
    const category = itemCategoryInput.value.trim();
    const price = Number(itemPriceInput.value);

    if (!name || !Number.isFinite(price) || price <= 0) {
      setStatus("Enter a valid item name and price.");
      return;
    }

    state.menu.unshift({
      id: "item-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      name: name,
      category: category,
      price: Number(price.toFixed(2)),
    });

    menuForm.reset();
    persistAndRender();
    setStatus(name + " added to your menu.");
    itemNameInput.focus();
  });

  clearOrderBtn.addEventListener("click", function () {
    state.order = {};
    persistAndRender();
    setStatus("The current order has been cleared.");
  });

  checkoutBtn.addEventListener("click", function () {
    const totals = getOrderTotals();

    if (!totals.total) {
      setStatus("Add items before taking payment.");
      return;
    }

    state.balance = Number((state.balance + totals.total).toFixed(2));
    state.order = {};
    persistAndRender();
    setStatus("Payment received. " + formatCurrency(totals.total) + " was added to your fake balance.");
  });

  resetBalanceBtn.addEventListener("click", function () {
    state.balance = 0;
    persistAndRender();
    setStatus("Your fake balance has been reset.");
  });

  persistAndRender();
})();
