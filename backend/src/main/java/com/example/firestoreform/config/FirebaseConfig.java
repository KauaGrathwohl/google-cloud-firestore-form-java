package com.example.firestoreform.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.ServiceOptions;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class FirebaseConfig {

    private static final String CLASSPATH_CREDENTIALS = "classpath:firebase-service-account.json";

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    private final String credentialsPath;
    private final String databaseId;
    private final ResourceLoader resourceLoader;

    public FirebaseConfig(@Value("${firebase.credentials:}") String credentialsPath,
                          @Value("${firebase.database-id:}") String databaseId,
                          ResourceLoader resourceLoader) {
        this.credentialsPath = credentialsPath;
        this.databaseId = databaseId;
        this.resourceLoader = resourceLoader;
    }

    @Bean
    public Firestore firestore() throws IOException {
        GoogleCredentials credentials = resolveCredentials();

        String projectId = resolveProjectId(credentials);

        synchronized (FirebaseConfig.class) {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions.Builder optionsBuilder = FirebaseOptions.builder()
                        .setCredentials(credentials);

                if (StringUtils.hasText(projectId)) {
                    optionsBuilder.setProjectId(projectId);
                    logger.info("Inicializando FirebaseApp com projectId={}", projectId);
                } else {
                    logger.warn("Inicializando FirebaseApp sem projectId explícito; o SDK tentará inferir.");
                }

                if (StringUtils.hasText(databaseId)) {
                    FirestoreOptions.Builder firestoreOptionsBuilder = FirestoreOptions.getDefaultInstance().toBuilder()
                            .setCredentials(credentials)
                            .setDatabaseId(databaseId);

                    if (StringUtils.hasText(projectId)) {
                        firestoreOptionsBuilder.setProjectId(projectId);
                    }

                    FirestoreOptions firestoreOptions = firestoreOptionsBuilder.build();
                    optionsBuilder.setFirestoreOptions(firestoreOptions);
                    logger.info("Configurando Firestore com databaseId={}", databaseId);
                }

                FirebaseOptions options = optionsBuilder.build();
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
            logger.info("Carregando credenciais do caminho absoluto: {}", credentialsPath);
            try (InputStream inputStream = Files.newInputStream(path)) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        Resource resource = resourceLoader.getResource(CLASSPATH_CREDENTIALS);
        if (resource.exists()) {
            logger.info("Carregando credenciais do classpath: {}", CLASSPATH_CREDENTIALS);
            try (InputStream inputStream = resource.getInputStream()) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        try {
            logger.info("Carregando credenciais via Application Default Credentials.");
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

    private String resolveProjectId(GoogleCredentials credentials) {
        String projectId = null;

        if (credentials instanceof ServiceAccountCredentials sac) {
            projectId = sac.getProjectId();
            logger.debug("ProjectId obtido a partir das credenciais: {}", projectId);
        }

        if (!StringUtils.hasText(projectId)) {
            projectId = ServiceOptions.getDefaultProjectId();
            logger.debug("ProjectId obtido via ServiceOptions: {}", projectId);
        }

        if (!StringUtils.hasText(projectId)) {
            logger.warn("Não foi possível determinar o projectId do Firestore a partir das credenciais disponíveis.");
        }

        return projectId;
    }
}


