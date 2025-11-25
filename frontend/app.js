(() => {
  const FALLBACK_BACKEND_URL = "http://localhost:8080";
  const baseFromWindow =
    typeof window.BACKEND_BASE_URL === "string"
      ? window.BACKEND_BASE_URL.trim()
      : "";
  const backendBaseUrl = baseFromWindow || FALLBACK_BACKEND_URL;
  const messagesEndpoint = new URL("/api/messages", backendBaseUrl).toString();

  const form = document.querySelector("#contact-form");
  const submitButton = form.querySelector('button[type="submit"]');
  const statusElement = document.querySelector("#form-status");

  const initialStatus = {
    message: "Preencha os campos e clique em enviar.",
    className: "muted",
  };

  function updateStatus(message, className = "muted") {
    statusElement.textContent = message;
    statusElement.className = className;
  }

  function disableForm(disabled) {
    const elements = form.querySelectorAll("input, textarea, button");
    elements.forEach((element) => {
      element.disabled = disabled;
    });
  }

  updateStatus(initialStatus.message, initialStatus.className);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton.disabled) {
      return;
    }

    const formData = Object.fromEntries(new FormData(form));

    updateStatus("Enviando dados para o servidor...", "info");
    disableForm(true);

    try {
      const response = await fetch(messagesEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Falha inesperada (${response.status})`);
      }

      updateStatus("Mensagem enviada com sucesso! ✅", "success");
      form.reset();
    } catch (error) {
      console.error("Erro ao enviar para o backend", error);
      updateStatus(
        `Não foi possível enviar (${error.message}). Verifique o console para detalhes.`,
        "error",
      );
    } finally {
      disableForm(false);
    }
  });
})();


