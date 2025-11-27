(() => {
  const FALLBACK_BACKEND_URL = "http://localhost:8080";
  const baseFromWindow =
    typeof window.BACKEND_BASE_URL === "string"
      ? window.BACKEND_BASE_URL.trim()
      : "";
  const backendBaseUrl = baseFromWindow || FALLBACK_BACKEND_URL;
  const messagesUrl = new URL("/api/messages", backendBaseUrl).toString();

  const body = document.body;
  const modal = document.querySelector("#message-modal");
  const modalDialog = modal?.querySelector(".modal__dialog");
  const modalTitle = document.querySelector("[data-modal-title]");
  const modalCloseButtons = modal?.querySelectorAll("[data-close-modal]") ?? [];
  const openCreateButton = document.querySelector("#open-create-modal");
  const form = document.querySelector("#message-form");
  const submitButton = form?.querySelector('button[type="submit"]');
  const statusElement = document.querySelector("#form-status");
  const refreshButton = document.querySelector("#refresh-messages");
  const filtersForm = document.querySelector("#messages-filters");
  const filterTextInput = document.querySelector("#filter-text");
  const messagesList = document.querySelector("#messages-list");
  const emptyListState = document.querySelector("#messages-empty");
  const listStatusElement = document.querySelector("#list-status");
  const nameInput = document.querySelector("#name");
  const emailInput = document.querySelector("#email");
  const messageInput = document.querySelector("#message");

  if (!form || !modal || !messagesList || !submitButton) {
    console.warn(
      "Elementos essenciais da interface não foram encontrados. Inicialização interrompida."
    );
    return;
  }

  let cachedMessages = [];
  let editingId = null;
  let lastFocusedElement = null;
  let isModalVisible = false;
  let lastRenderedCount = 0;
  let lastTotalCount = 0;
  let listStatusTimeoutId = null;

  const initialStatus = {
    message: "Preencha os campos e clique em salvar.",
    className: "muted",
  };

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

  function updateStatus(message, className = "muted") {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
    statusElement.className = className;
  }

  function setListStatus(message, className = "muted", clearTimer = true) {
    if (!listStatusElement) {
      return;
    }
    if (clearTimer && listStatusTimeoutId) {
      clearTimeout(listStatusTimeoutId);
      listStatusTimeoutId = null;
    }
    listStatusElement.textContent = message;
    listStatusElement.className = className;
  }

  function updateListStatus(displayedCount, totalCount) {
    lastRenderedCount = displayedCount;
    lastTotalCount = totalCount;

    if (listStatusTimeoutId) {
      return;
    }

    if (totalCount === 0) {
      setListStatus("Nenhum registro disponível.", "muted", false);
      return;
    }

    const hasFilter = displayedCount !== totalCount;
    const message = hasFilter
      ? `Exibindo ${displayedCount} de ${totalCount} registros (filtro ativo).`
      : `Exibindo ${displayedCount} de ${totalCount} registros.`;
    setListStatus(message, "muted", false);
  }

  function flashListStatus(message, className = "muted", duration = 3200) {
    setListStatus(message, className, true);
    listStatusTimeoutId = window.setTimeout(() => {
      listStatusTimeoutId = null;
      updateListStatus(lastRenderedCount, lastTotalCount);
    }, duration);
  }

  function formatTimestamp(value) {
    if (!value) {
      return "Sem data";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Sem data";
    }
    try {
      return dateFormatter.format(date);
    } catch (error) {
      console.warn("Não foi possível formatar a data:", error);
      return date.toLocaleString();
    }
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function disableForm(disabled) {
    const elements = form.querySelectorAll("input, textarea, button");
    elements.forEach((element) => {
      element.disabled = disabled;
    });
  }

  function getMessageDetailUrl(id) {
    return new URL(id, `${messagesUrl}/`).toString();
  }

  function openModal(mode, entry = null) {
    lastFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    isModalVisible = true;
    body.classList.add("modal-open");
    modal.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");

    disableForm(false);

    if (mode === "edit" && entry) {
      editingId = entry.id ?? null;
      if (nameInput) nameInput.value = entry.name || "";
      if (emailInput) emailInput.value = entry.email || "";
      if (messageInput) messageInput.value = entry.message || "";
      submitButton.textContent = "Salvar alterações";
      if (modalTitle) {
        modalTitle.textContent = "Editar registro";
      }
      updateStatus(
        "Atualize as informações e confirme para sincronizar com o Firestore.",
        "muted"
      );
    } else {
      editingId = null;
      form.reset();
      submitButton.textContent = "Salvar registro";
      if (modalTitle) {
        modalTitle.textContent = "Nova mensagem";
      }
      updateStatus(initialStatus.message, initialStatus.className);
    }

    window.requestAnimationFrame(() => {
      nameInput?.focus({ preventScroll: true });
    });
  }

  function closeModal({ resetForm = true, restoreFocus = true } = {}) {
    if (!isModalVisible) {
      return;
    }

    isModalVisible = false;
    modal.classList.remove("modal--open");
    modal.setAttribute("aria-hidden", "true");
    body.classList.remove("modal-open");

    disableForm(false);
    editingId = null;

    if (resetForm) {
      form.reset();
      updateStatus(initialStatus.message, initialStatus.className);
    }

    if (restoreFocus && lastFocusedElement) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function trapFocus(event) {
    if (!isModalVisible || event.key !== "Tab" || !modalDialog) {
      return;
    }

    const focusableSelectors =
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      modalDialog.querySelectorAll(focusableSelectors)
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        element.getAttribute("tabindex") !== "-1" &&
        element.offsetParent !== null
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const isShiftPressed = event.shiftKey;
    const active = document.activeElement;

    if (!isShiftPressed && active === last) {
      event.preventDefault();
      first.focus();
    } else if (isShiftPressed && active === first) {
      event.preventDefault();
      last.focus();
    }
  }

  function setListLoading(loading) {
    if (refreshButton) {
      refreshButton.disabled = loading;
      if (loading) {
        refreshButton.setAttribute("aria-busy", "true");
      } else {
        refreshButton.removeAttribute("aria-busy");
      }
    }

    if (filtersForm) {
      const filterElements = filtersForm.querySelectorAll("input, button");
      filterElements.forEach((element) => {
        element.disabled = loading;
      });
    }

    if (loading) {
      if (messagesList) {
        messagesList.hidden = true;
      }
      if (emptyListState) {
        emptyListState.textContent = "Carregando mensagens...";
        emptyListState.className = "info";
        emptyListState.hidden = false;
      }
      setListStatus("Carregando mensagens...", "info");
    }
  }

  function renderMessages(messages, options = {}) {
    if (!messagesList || !emptyListState) {
      return;
    }

    const {
      emptyMessage = "Nenhum registro encontrado ainda.",
      emptyClass = "muted",
    } = options;

    messagesList.innerHTML = "";

    if (!Array.isArray(messages) || messages.length === 0) {
      emptyListState.textContent = emptyMessage;
      emptyListState.className = emptyClass;
      emptyListState.hidden = false;
      messagesList.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();

    messages.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "messages-list-item";
      if (entry.id) {
        item.dataset.id = entry.id;
      }

      const meta = document.createElement("p");
      meta.className = "message-meta";
      const createdLabel = formatTimestamp(entry.createdAt);
      meta.textContent = [entry.name || "Sem nome", entry.email || "Sem e-mail", createdLabel]
        .filter(Boolean)
        .join(" • ");

      const body = document.createElement("p");
      body.className = "message-body";
      body.textContent = entry.message || "";

      const actions = document.createElement("div");
      actions.className = "message-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn btn-link";
      editButton.textContent = "Editar";
      editButton.setAttribute(
        "aria-label",
        `Editar mensagem de ${entry.name || "contato"}`
      );
      editButton.addEventListener("click", () => openModal("edit", entry));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-link btn-danger";
      deleteButton.textContent = "Excluir";
      deleteButton.setAttribute(
        "aria-label",
        `Excluir mensagem de ${entry.name || "contato"}`
      );
      deleteButton.addEventListener("click", () =>
        handleDelete(entry.id, deleteButton)
      );

      actions.append(editButton, deleteButton);
      item.append(meta, body, actions);
      fragment.appendChild(item);
    });

    messagesList.appendChild(fragment);
    messagesList.hidden = false;
    emptyListState.hidden = true;
  }

  function applyFilters() {
    const query = (filterTextInput?.value || "").trim();
    const normalizedQuery = query ? normalizeText(query) : "";

    let filtered = cachedMessages;
    if (normalizedQuery) {
      filtered = cachedMessages.filter((entry) => {
        const searchable = [
          entry.name ?? "",
          entry.email ?? "",
          entry.message ?? "",
        ]
          .map((value) => normalizeText(value))
          .join(" ");
        return searchable.includes(normalizedQuery);
      });
    }

    const emptyMessage =
      cachedMessages.length === 0
        ? "Nenhum registro encontrado ainda."
        : normalizedQuery
        ? "Nenhum registro corresponde ao filtro aplicado."
        : "Nenhum registro encontrado ainda.";

    const emptyClass =
      normalizedQuery && cachedMessages.length > 0 ? "info" : "muted";

    renderMessages(filtered, { emptyMessage, emptyClass });
    updateListStatus(filtered.length, cachedMessages.length);
  }

  async function handleDelete(id, triggerButton) {
    if (!id) {
      return;
    }

    const shouldDelete = window.confirm(
      "Tem certeza de que deseja excluir esta mensagem?"
    );
    if (!shouldDelete) {
      return;
    }

    if (triggerButton) {
      triggerButton.disabled = true;
    }

    setListStatus("Removendo registro...", "info");

    try {
      const response = await fetch(getMessageDetailUrl(id), {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Falha inesperada (${response.status})`);
      }

      cachedMessages = cachedMessages.filter((entry) => entry.id !== id);
      applyFilters();
      flashListStatus("Registro removido com sucesso! ✅", "success");
    } catch (error) {
      console.error("Erro ao excluir mensagem", error);
      flashListStatus(
        `Não foi possível excluir (${error.message}).`,
        "error",
        4200
      );
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false;
        triggerButton.focus();
      }
    }
  }

  async function fetchMessages() {
    setListLoading(true);

    try {
      const response = await fetch(messagesUrl);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Falha inesperada (${response.status})`);
      }
      const data = await response.json();
      cachedMessages = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (error) {
      console.error("Erro ao carregar mensagens", error);
      if (emptyListState) {
        emptyListState.textContent = `Não foi possível carregar mensagens (${error.message}).`;
        emptyListState.className = "error";
        emptyListState.hidden = false;
      }
      if (messagesList) {
        messagesList.hidden = true;
      }
      setListStatus("Erro ao carregar mensagens.", "error");
    } finally {
      setListLoading(false);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton.disabled) {
      return;
    }

    const formData = Object.fromEntries(new FormData(form));
    const targetUrl = editingId ? getMessageDetailUrl(editingId) : messagesUrl;
    const method = editingId ? "PUT" : "POST";

    updateStatus(
      editingId
        ? "Atualizando mensagem..."
        : "Enviando dados para o servidor...",
      "info"
    );
    disableForm(true);

    try {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Falha inesperada (${response.status})`);
      }

      flashListStatus(
        editingId
          ? "Mensagem atualizada com sucesso! ✅"
          : "Mensagem registrada com sucesso! ✅",
        "success"
      );

      closeModal({ resetForm: true, restoreFocus: true });
      await fetchMessages();
    } catch (error) {
      console.error("Erro ao enviar para o backend", error);
      updateStatus(
        `Não foi possível enviar (${error.message}). Verifique o console para detalhes.`,
        "error"
      );
    } finally {
      disableForm(false);
    }
  });

  if (openCreateButton) {
    openCreateButton.addEventListener("click", () => openModal("create"));
  }

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => closeModal());
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (isModalVisible && event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }
    trapFocus(event);
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      fetchMessages();
    });
  }

  if (filtersForm) {
    filtersForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });

    filtersForm.addEventListener("reset", (event) => {
      event.preventDefault();
      if (filterTextInput) {
        filterTextInput.value = "";
      }
      applyFilters();
    });
  }

  if (filterTextInput) {
    filterTextInput.addEventListener("input", () => {
      applyFilters();
    });
  }

  updateStatus(initialStatus.message, initialStatus.className);
  fetchMessages();
})();

