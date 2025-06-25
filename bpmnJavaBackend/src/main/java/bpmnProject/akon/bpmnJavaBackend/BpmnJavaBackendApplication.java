package bpmnProject.akon.bpmnJavaBackend;

import bpmnProject.akon.bpmnJavaBackend.Auth.AuthenticationService;
import bpmnProject.akon.bpmnJavaBackend.Auth.RegisterRequest;
import bpmnProject.akon.bpmnJavaBackend.User.Role;
import bpmnProject.akon.bpmnJavaBackend.User.RoleRepository;
import bpmnProject.akon.bpmnJavaBackend.User.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Set;

@SpringBootApplication
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class BpmnJavaBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BpmnJavaBackendApplication.class, args);
	}
}