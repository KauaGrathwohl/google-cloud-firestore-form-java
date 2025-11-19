package com.example.firestoreform.controller;

import com.example.firestoreform.dto.MessageRequest;
import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

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
}

