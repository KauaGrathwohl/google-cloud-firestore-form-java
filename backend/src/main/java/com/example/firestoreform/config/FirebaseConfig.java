package com.example.firestoreform.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class FirebaseConfig {

    private static final String CLASSPATH_CREDENTIALS = "classpath:firebase-service-account.json";

    private final String credentialsPath;
    private final ResourceLoader resourceLoader;

    public FirebaseConfig(@Value("${firebase.credentials:}") String credentialsPath,
                          ResourceLoader resourceLoader) {
        this.credentialsPath = credentialsPath;
        this.resourceLoader = resourceLoader;
    }

    @Bean
    public Firestore firestore() throws IOException {
        GoogleCredentials credentials = resolveCredentials();

        synchronized (FirebaseConfig.class) {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();
                FirebaseApp.initializeApp(options);
            }
        }
        return FirestoreClient.getFirestore();
    }

    private GoogleCredentials resolveCredentials() throws IOException {
        if (StringUtils.hasText(credentialsPath)) {
            Path path = Path.of(credentialsPath);
            if (!Files.exists(path)) {
                throw new IOException("Arquivo de credenciais não encontrado em: " + credentialsPath);
            }
            try (InputStream inputStream = Files.newInputStream(path)) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        Resource resource = resourceLoader.getResource(CLASSPATH_CREDENTIALS);
        if (resource.exists()) {
            try (InputStream inputStream = resource.getInputStream()) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        try {
            return GoogleCredentials.getApplicationDefault();
        } catch (IOException ex) {
            throw new IOException(
                    """
                    Não foi possível localizar as credenciais do Firebase. Configure uma das opções:
                    - Defina firebase.credentials em application.properties
                    - Adicione firebase-service-account.json em src/main/resources
                    - Configure a variável GOOGLE_APPLICATION_CREDENTIALS
                    """, ex);
        }
    }
}


