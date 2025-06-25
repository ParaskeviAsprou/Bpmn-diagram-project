package bpmnProject.akon.bpmnJavaBackend.Config;

import bpmnProject.akon.bpmnJavaBackend.User.Role;
import bpmnProject.akon.bpmnJavaBackend.User.RoleRepository;
import bpmnProject.akon.bpmnJavaBackend.User.User;
import bpmnProject.akon.bpmnJavaBackend.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Create roles if they don't exist
        createRoleIfNotExists(Role.ROLE_ADMIN, "Administrator", "Full system access");
        createRoleIfNotExists(Role.ROLE_MODELER, "Modeler", "Can edit and view diagrams");
        createRoleIfNotExists(Role.ROLE_VIEWER, "Viewer", "Can only view diagrams");

        // Create default users if they don't exist
        createDefaultUsers();
    }

    private void createRoleIfNotExists(String roleName, String displayName, String description) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            Role role = Role.builder()
                    .name(roleName)
                    .displayName(displayName)
                    .description(description)
                    .build();
            roleRepository.save(role);
            System.out.println("Created role: " + roleName);
        }
    }

    private void createDefaultUsers() {
        // Create admin user
        if (userRepository.findByUsername("admin").isEmpty()) {
            Role adminRole = roleRepository.findByName(Role.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Admin role not found"));

            User admin = User.builder()
                    .username("admin")
                    .email("admin@example.com")
                    .firstname("Admin")
                    .lastname("User")
                    .password(passwordEncoder.encode("admin123"))
                    .enabled(true)
                    .accountNonExpired(true)
                    .accountNonLocked(true)
                    .credentialsNonExpired(true)
                    .roles(new HashSet<>())
                    .build();

            User savedAdmin = userRepository.save(admin);
            savedAdmin.getRoles().add(adminRole);
            savedAdmin = userRepository.save(savedAdmin);

            savedAdmin.printAccountStatus(); // Debug
            System.out.println("Created admin user: admin/admin123");
        }

        // Create modeler user
        if (userRepository.findByUsername("modeler").isEmpty()) {
            Role modelerRole = roleRepository.findByName(Role.ROLE_MODELER)
                    .orElseThrow(() -> new RuntimeException("Modeler role not found"));

            User modeler = User.builder()
                    .username("modeler")
                    .email("modeler@example.com")
                    .firstname("Modeler")
                    .lastname("User")
                    .password(passwordEncoder.encode("modeler123"))
                    .enabled(true)
                    .accountNonExpired(true)
                    .accountNonLocked(true)
                    .credentialsNonExpired(true)
                    .roles(new HashSet<>())
                    .build();

            User savedModeler = userRepository.save(modeler);
            savedModeler.getRoles().add(modelerRole);
            savedModeler = userRepository.save(savedModeler);

            savedModeler.printAccountStatus(); // Debug
            System.out.println("Created modeler user: modeler/modeler123");
        }

        // Create viewer user
        if (userRepository.findByUsername("viewer").isEmpty()) {
            Role viewerRole = roleRepository.findByName(Role.ROLE_VIEWER)
                    .orElseThrow(() -> new RuntimeException("Viewer role not found"));

            User viewer = User.builder()
                    .username("viewer")
                    .email("viewer@example.com")
                    .firstname("Viewer")
                    .lastname("User")
                    .password(passwordEncoder.encode("viewer123"))
                    .enabled(true)
                    .accountNonExpired(true)
                    .accountNonLocked(true)
                    .credentialsNonExpired(true)
                    .roles(new HashSet<>())
                    .build();

            User savedViewer = userRepository.save(viewer);
            savedViewer.getRoles().add(viewerRole);
            savedViewer = userRepository.save(savedViewer);

            savedViewer.printAccountStatus(); // Debug
            System.out.println("Created viewer user: viewer/viewer123");
        }
    }
}