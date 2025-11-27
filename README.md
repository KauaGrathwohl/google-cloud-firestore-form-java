# Formulário - Java e Firestore

Este repositório demonstra um fluxo completo onde um front-end estático (HTML/CSS/JS) envia dados para uma API Java (Spring Boot), que por sua vez persiste as informações em uma coleção do **Cloud Firestore**. É uma base simples para validar integrações do Google Cloud sem depender de Node.js.

## Estrutura do projeto

```
Estudo-Google-Cloud/
├── backend/                   # Aplicação Spring Boot
│   ├── pom.xml
│   └── src/main/...
├── frontend/                  # Front-end estático (sem npm)
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── README.md
```

## Pré-requisitos

- Conta no **Google Cloud** com faturamento habilitado.
- Projeto criado no Google Cloud Console.
- **FireStore** ativado no modo *Native*.
- **Java 21** (JDK) instalado.
- Maven instalado (ou utilize o `mvnw.cmd` incluído no projeto Spring Boot).
- (Opcional) Python ≥ 3.8 para servir a pasta `frontend` localmente.

## Passo 1 — Habilitar o Firestore

1. No [Google Cloud Console](https://console.cloud.google.com/), selecione o projeto.
2. Navegue até **Firestore** › **Databases**.
3. Clique em **Create database**, escolha o modo **Native** e defina a região.
4. Confirme a criação.

> 💡 O modo bloqueado padrão já impede acessos públicos; mantenha assim enquanto testa apenas pela API.

## Passo 2 — Criar uma conta de serviço para o backend

1. No Console GCP, acesse **IAM & Admin** › **Service Accounts**.
2. Crie uma conta (ex.: `firestore-form-backend`).
3. Conceda a função **Cloud Datastore User** ou **Firestore Editor**.
4. Após criar, clique em **Keys** › **Add Key** › **Create new key** (JSON).
5. Salve o arquivo em um local seguro (ex.: `C:\chaves\firestore-form.json`).
6. Escolha **uma** das formas de disponibilizar a credencial para o backend:
   - Copie/Renomeie o JSON para `backend/src/main/resources/firebase-service-account.json`. Há um modelo `firebase-service-account.sample.json` na pasta para consulta.
   - Defina a propriedade no `application.properties`:

     ```
     firebase.credentials=C:/chaves/firestore-form.json
     ```

   - Defina a variável de ambiente (Application Default Credentials):

```
setx GOOGLE_APPLICATION_CREDENTIALS "C:\chaves\firestore-form.json"
```

7. Se escolher a variável de ambiente, feche e reabra o terminal para surtir efeito.

## Passo 3 — Subir o backend Java

1. Abra o PowerShell:
   ```
   cd C:\Users\6127165\Documents\Estudo-Google-Cloud\backend
   ```
2. Compile e execute (escolha uma opção):
   - Usando Maven local: `mvn spring-boot:run`
   - Usando o wrapper: `.\mvnw.cmd spring-boot:run`
3. A API ficará acessível em `http://localhost:8080`.

### Endpoint disponível

- `POST /api/messages`
  - Exemplo de corpo:
    ```json
    {
      "name": "Maria",
      "email": "maria@example.com",
      "message": "Olá Cloud!"
    }
    ```
  - Resposta `201 Created`:
    ```json
    {
      "id": "autoGeradoPeloFirestore",
      "message": "Mensagem registrada com sucesso."
    }
    ```
- `GET /api/messages`
  - Retorna a lista de documentos armazenados na coleção `contactMessages`.
  - Exemplo de resposta `200 OK`:
    ```json
    [
      {
        "id": "autoGeradoPeloFirestore",
        "name": "Maria",
        "email": "maria@example.com",
        "message": "Olá Cloud!",
        "createdAt": "2024-05-07T22:35:42.123Z"
      }
    ]
    ```
- `PUT /api/messages/{id}`
  - Atualiza um documento existente na coleção.
  - Exemplo de corpo:
    ```json
    {
      "name": "Maria Atualizada",
      "email": "maria@example.com",
      "message": "Mensagem revisada"
    }
    ```
  - Resposta `200 OK`:
    ```json
    {
      "id": "autoGeradoPeloFirestore",
      "message": "Mensagem atualizada com sucesso."
    }
    ```
- `DELETE /api/messages/{id}`
  - Remove definitivamente um documento da coleção.
  - Resposta `200 OK`:
    ```json
    {
      "id": "autoGeradoPeloFirestore",
      "message": "Mensagem removida com sucesso."
    }
    ```

## Passo 4 — Servir o front-end estático (separado do backend)

O front-end fica totalmente isolado na pasta `frontend`. Em um terminal separado:

```
cd C:\Users\6127165\Documents\Estudo-Google-Cloud\frontend
python -m http.server 8081
```

Abra `http://localhost:8081/index.html` no navegador. O formulário enviará solicitações para `http://localhost:8080/api/messages` (o backend precisa estar rodando nessa URL).

> Para apontar para outro backend, defina `window.BACKEND_BASE_URL` no `index.html` antes de carregar o `app.js`, ou ajuste diretamente o arquivo `app.js`.

### Experiência no front-end

- Painel único com listagem, busca e botões de ação diretos; cadastros e edições acontecem em modais responsivos, mantendo o foco visual.
- Inputs, botões e mensagens seguem padrão global (contraste, estados de foco e suporte a teclado) e utilizam feedbacks em tempo real.
- A lista mostra contagem de registros exibidos, respeita filtros textuais e permite editar/excluir cada item sem recarregar a página.

## Passo 5 — Conferir os dados no Firestore

1. No console do Firestore, abra a aba **Data**.
2. A coleção `contactMessages` será criada no primeiro envio.
3. Cada documento traz `name`, `email`, `message` e `createdAt`.

## Boas práticas e próximos passos

- **Restringir segurança**: ajuste as regras do Firestore para aceitar apenas tráfego autenticado ou valide campos no backend.
- **Validações adicionais**: a API já aplica validações básicas; expanda conforme o negócio exigir.
- **Deploy**: considere publicar o backend no Cloud Run ou GKE e o front-end no Firebase Hosting ou Cloud Storage.
- **Observabilidade**: ative Cloud Logging e Cloud Monitoring para acompanhar erros ou lentidão.

---

Com essa estrutura você tem um exemplo funcional em Java, pronto para evoluir para pipelines mais complexos no Google Cloud.

