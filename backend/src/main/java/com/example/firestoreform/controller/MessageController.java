package com.example.firestoreform.controller;

import com.example.firestoreform.dto.MessageRequest;
import com.example.firestoreform.dto.MessageResponse;
import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    private static final Logger logger = LoggerFactory.getLogger(MessageController.class);

    private final CollectionReference collection;

    public MessageController(Firestore firestore) {
        this.collection = firestore.collection("contactMessages");
    }

    @PostMapping
    public ResponseEntity<?> createMessage(@Validated @RequestBody MessageRequest request) {
        Map<String, Object> payload = Map.of(
                "name", request.name(),
                "email", request.email(),
                "message", request.message(),
                "createdAt", Timestamp.now()
        );

        try {
            ApiFuture<DocumentReference> future = collection.add(payload);
            DocumentReference reference = future.get();
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "id", reference.getId(),
                            "message", "Mensagem registrada com sucesso."
                    ));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Envio interrompido, tente novamente."));
        } catch (ExecutionException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Falha ao registrar mensagem: " + e.getCause().getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> listMessages() {
        try {
            ApiFuture<QuerySnapshot> future = collection.orderBy("createdAt", Query.Direction.DESCENDING).get();
            List<MessageResponse> messages = future.get().getDocuments().stream()
                    .map(this::toResponse)
                    .toList();
            return ResponseEntity.ok(messages);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Consulta interrompida, tente novamente."));
        } catch (ExecutionException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Falha ao consultar mensagens: " + e.getCause().getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMessage(@PathVariable String id,
                                           @Validated @RequestBody MessageRequest request) {
        DocumentReference document = collection.document(id);

        try {
            DocumentSnapshot snapshot = document.get().get();

            if (!snapshot.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Mensagem não encontrada."));
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("name", request.name());
            updates.put("email", request.email());
            updates.put("message", request.message());
            updates.put("updatedAt", Timestamp.now());

            ApiFuture<WriteResult> future = document.update(updates);
            future.get();

            return ResponseEntity.ok(Map.of(
                    "id", id,
                    "message", "Mensagem atualizada com sucesso."
            ));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Atualização interrompida, tente novamente."));
        } catch (ExecutionException e) {
            logger.error("Erro ao atualizar mensagem {}", id, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Falha ao atualizar mensagem: " + e.getCause().getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable String id) {
        DocumentReference document = collection.document(id);

        try {
            DocumentSnapshot snapshot = document.get().get();
            if (!snapshot.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Mensagem não encontrada."));
            }

            ApiFuture<WriteResult> future = document.delete();
            future.get();

            return ResponseEntity.ok(Map.of(
                    "id", id,
                    "message", "Mensagem removida com sucesso."
            ));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Exclusão interrompida, tente novamente."));
        } catch (ExecutionException e) {
            logger.error("Erro ao excluir mensagem {}", id, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Falha ao excluir mensagem: " + e.getCause().getMessage()));
        }
    }

    private MessageResponse toResponse(QueryDocumentSnapshot document) {
        Timestamp createdAt = document.getTimestamp("createdAt");
        Instant createdAtInstant = createdAt != null ? createdAt.toDate().toInstant() : null;

        return new MessageResponse(
                document.getId(),
                document.getString("name"),
                document.getString("email"),
                document.getString("message"),
                createdAtInstant
        );
    }
}

