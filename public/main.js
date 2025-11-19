const form = document.querySelector("#contact-form");
const statusParagraph = document.querySelector("#form-status");

function setStatus(message, type = "info") {
  statusParagraph.textContent = message;
  statusParagraph.className = type;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const payload = {
    name: data.get("name"),
    email: data.get("email"),
    message: data.get("message"),
  };

  setStatus("Enviando dados para o servidor...", "info");

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Falha inesperada");
    }

    setStatus("Mensagem enviada com sucesso! ✅", "success");
    form.reset();
  } catch (error) {
    console.error("Erro ao enviar para o backend", error);
    setStatus(
      "Não foi possível enviar. Verifique o console para detalhes.",
      "error",
    );
  }
});

