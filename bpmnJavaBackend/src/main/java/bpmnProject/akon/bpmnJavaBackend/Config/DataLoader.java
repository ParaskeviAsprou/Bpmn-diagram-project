package bpmnProject.akon.bpmnJavaBackend.Config;

import bpmnProject.akon.bpmnJavaBackend.File.DiagramAssignment;
import bpmnProject.akon.bpmnJavaBackend.File.DiagramAssignmentService;
import bpmnProject.akon.bpmnJavaBackend.File.File;
import bpmnProject.akon.bpmnJavaBackend.File.FileRepository;
import bpmnProject.akon.bpmnJavaBackend.User.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleHierarchyService roleHierarchyService;
    private final GroupService groupService;
    private final DiagramAssignmentService assignmentService;
    private final FileRepository fileRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== Starting RBAC Data Loading ===");

        // Execute each step in separate transactions to allow partial success
        loadRoles();
        loadUsers();
        loadRoleHierarchy();
        loadGroups();
        loadAssignments();

        System.out.println("=== RBAC Data Loading Complete ===");
    }

    @Transactional
    public void loadRoles() {
        try {
            System.out.println("Loading roles...");
            createRoleIfNotExists(Role.ROLE_ADMIN, "Administrator", "Full system access and user management");
            createRoleIfNotExists(Role.ROLE_MODELER, "Modeler", "Can create, edit and share diagrams");
            createRoleIfNotExists(Role.ROLE_VIEWER, "Viewer", "Can only view assigned diagrams");
            System.out.println("Roles loaded successfully");
        } catch (Exception e) {
            System.err.println("Error loading roles: " + e.getMessage());
            throw e; // Critical - can't continue without roles
        }
    }

    @Transactional
    public void loadUsers() {
        try {
            System.out.println("Loading users...");
            createDefaultUsers();
            System.out.println("Users loaded successfully");
        } catch (Exception e) {
            System.err.println("Error loading users: " + e.getMessage());
            throw e; // Critical - can't continue without users
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loadRoleHierarchy() {
        try {
            System.out.println("Loading role hierarchy...");
            createRoleHierarchy();
            System.out.println("Role hierarchy loaded successfully");
        } catch (Exception e) {
            System.err.println("Error loading role hierarchy (non-critical): " + e.getMessage());
            // Don't rethrow - hierarchy is nice to have but not critical
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loadGroups() {
        try {
            System.out.println("Loading groups...");
            createSampleGroups();
            System.out.println("Groups loaded successfully");
        } catch (Exception e) {
            System.err.println("Error loading groups (non-critical): " + e.getMessage());
            // Don't rethrow - groups are sample data
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loadAssignments() {
        try {
            System.out.println("Loading sample assignments...");
            createSampleAssignments();
            System.out.println("Assignments loaded successfully");
        } catch (Exception e) {
            System.err.println("Error loading assignments (non-critical): " + e.getMessage());

        }
    }
    private void createRoleIfNotExists(String roleName, String displayName, String description) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            Role role = Role.builder()
                    .name(roleName)
                    .displayName(displayName)
                    .description(description)
                    .build();
            roleRepository.save(role);
            System.out.println("Created role: " + roleName + " (" + displayName + ")");
        } else {
            System.out.println("Role already exists: " + roleName);
        }
    }

    private void createRoleHierarchy() {
        try {
            Optional<Role> adminRole = roleRepository.findByName(Role.ROLE_ADMIN);
            Optional<Role> modelerRole = roleRepository.findByName(Role.ROLE_MODELER);
            Optional<Role> viewerRole = roleRepository.findByName(Role.ROLE_VIEWER);

            if (adminRole.isPresent() && modelerRole.isPresent()) {
                try {
                    // Updated method call with Integer parameter
                    roleHierarchyService.createHierarchy(
                            adminRole.get().getId(),
                            modelerRole.get().getId(),
                            1  // hierarchy level as Integer
                    );
                    System.out.println("Created hierarchy: ADMIN -> MODELER");
                } catch (Exception e) {
                    if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                        System.out.println("Hierarchy already exists: ADMIN -> MODELER");
                    } else {
                        System.err.println("Error creating ADMIN -> MODELER hierarchy: " + e.getMessage());
                    }
                }
            }

            if (modelerRole.isPresent() && viewerRole.isPresent()) {
                try {
                    // Updated method call with Integer parameter
                    roleHierarchyService.createHierarchy(
                            modelerRole.get().getId(),
                            viewerRole.get().getId(),
                            1  // hierarchy level as Integer
                    );
                    System.out.println("Created hierarchy: MODELER -> VIEWER");
                } catch (Exception e) {
                    if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                        System.out.println("Hierarchy already exists: MODELER -> VIEWER");
                    } else {
                        System.err.println("Error creating MODELER -> VIEWER hierarchy: " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error creating role hierarchy: " + e.getMessage());
        }
    }

    private void createDefaultUsers() {
        // Create admin user
        createUserIfNotExists(
                "admin", "admin@example.com", "Admin", "User", "admin123",
                Role.ROLE_ADMIN, true, true, true, true
        );

        // Create modeler user
        createUserIfNotExists(
                "modeler", "modeler@example.com", "Modeler", "User", "modeler123",
                Role.ROLE_MODELER, true, true, true, true
        );

        // Create viewer user
        createUserIfNotExists(
                "viewer", "viewer@example.com", "Viewer", "User", "viewer123",
                Role.ROLE_VIEWER, true, true, true, true
        );

        // Create additional test users
        createUserIfNotExists(
                "john.doe", "john.doe@example.com", "John", "Doe", "password123",
                Role.ROLE_MODELER, true, true, true, true
        );

        createUserIfNotExists(
                "jane.smith", "jane.smith@example.com", "Jane", "Smith", "password123",
                Role.ROLE_VIEWER, true, true, true, true
        );

        createUserIfNotExists(
                "bob.wilson", "bob.wilson@example.com", "Bob", "Wilson", "password123",
                Role.ROLE_VIEWER, true, true, true, true
        );
    }

    private void createUserIfNotExists(String username, String email, String firstName, String lastName,
                                       String password, String roleName, boolean enabled, boolean accountNonExpired,
                                       boolean accountNonLocked, boolean credentialsNonExpired) {
        if (userRepository.findByUsername(username).isEmpty()) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

            User user = User.builder()
                    .username(username)
                    .email(email)
                    .firstname(firstName)
                    .lastname(lastName)
                    .password(passwordEncoder.encode(password))
                    .enabled(enabled)
                    .accountNonExpired(accountNonExpired)
                    .accountNonLocked(accountNonLocked)
                    .credentialsNonExpired(credentialsNonExpired)
                    .roles(new HashSet<>())
                    .build();

            User savedUser = userRepository.save(user);
            savedUser.getRoles().add(role);
            savedUser = userRepository.save(savedUser);

            System.out.println("Created user: " + username + " with role: " + roleName);
        } else {
            System.out.println("User already exists: " + username);
        }
    }

    private void createSampleGroups() {
        try {
            // Create Development Team group
            createGroupIfNotExists("Development Team",
                    "Software developers and architects",
                    "admin",
                    List.of("modeler", "john.doe"));

            // Create Business Analysts group
            createGroupIfNotExists("Business Analysts",
                    "Business process analysts and consultants",
                    "admin",
                    List.of("viewer", "jane.smith"));

            // Create Management group
            createGroupIfNotExists("Management",
                    "Project and department managers",
                    "admin",
                    List.of("admin"));

            // Create QA Team group
            createGroupIfNotExists("QA Team",
                    "Quality assurance and testing team",
                    "admin",
                    List.of("viewer", "bob.wilson"));

        } catch (Exception e) {
            System.err.println("Error creating sample groups: " + e.getMessage());
            // Don't rethrow - let other initialization continue
        }
    }

    private void createGroupIfNotExists(String groupName, String description, String createdBy, List<String> usernames) {
        try {
            // Fixed: Check if group exists by searching first, not by ID
            List<Group> existingGroups = groupService.searchGroups(groupName);
            Optional<Group> existingGroup = existingGroups.stream()
                    .filter(g -> g.getName().equals(groupName))
                    .findFirst();

            if (existingGroup.isEmpty()) {
                Group group = groupService.createGroup(groupName, description, createdBy);
                System.out.println("Created group: " + groupName);

                // Add users to group
                for (String username : usernames) {
                    Optional<User> user = userRepository.findByUsername(username);
                    if (user.isPresent()) {
                        try {
                            groupService.addUserToGroup(group.getId(), user.get().getId());
                            System.out.println("Added user " + username + " to group " + groupName);
                        } catch (Exception e) {
                            System.err.println("Error adding user " + username + " to group " + groupName + ": " + e.getMessage());
                        }
                    } else {
                        System.err.println("User not found for group assignment: " + username);
                    }
                }
            } else {
                System.out.println("Group already exists: " + groupName);
            }
        } catch (Exception e) {
            System.err.println("Error creating group " + groupName + ": " + e.getMessage());
            // Don't rethrow - continue with other groups
        }
    }

    private Long getGroupIdByName(String groupName) {
        try {
            List<Group> groups = groupService.searchGroups(groupName);
            return groups.stream()
                    .filter(g -> g.getName().equals(groupName))
                    .findFirst()
                    .map(Group::getId)
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private void createSampleAssignments() {
        try {
            // Wait a bit to ensure files might exist
            List<File> existingFiles = fileRepository.findAll();
            System.out.println("Found " + existingFiles.size() + " existing files for sample assignments");

            if (!existingFiles.isEmpty()) {
                // Create sample diagram for demo purposes
                createSampleDiagramAssignments(existingFiles);
            } else {
                System.out.println("No files found - skipping sample assignments");
            }

        } catch (Exception e) {
            System.err.println("Error creating sample assignments: " + e.getMessage());
        }
    }

    private void createSampleDiagramAssignments(List<File> files) {
        try {
            // Get sample users and groups
            Optional<User> modelerUser = userRepository.findByUsername("john.doe");
            Optional<User> viewerUser = userRepository.findByUsername("jane.smith");
            Optional<Role> viewerRole = roleRepository.findByName(Role.ROLE_VIEWER);

            if (!files.isEmpty()) {
                File sampleFile = files.get(0); // Use first available file

                // Assign first file to modeler user with ADMIN permission
                if (modelerUser.isPresent()) {
                    try {
                        assignmentService.assignDiagramToUser(
                                sampleFile.getId(),
                                modelerUser.get().getId(),
                                DiagramAssignment.PermissionLevel.ADMIN,
                                "admin",
                                "Sample assignment to modeler"
                        );
                        System.out.println("Assigned diagram to modeler user");
                    } catch (Exception e) {
                        if (!e.getMessage().contains("already has access")) {
                            System.err.println("Error assigning to modeler: " + e.getMessage());
                        }
                    }
                }

                // Assign to viewer role with VIEW permission
                if (viewerRole.isPresent()) {
                    try {
                        assignmentService.assignDiagramToRole(
                                sampleFile.getId(),
                                viewerRole.get().getId(),
                                DiagramAssignment.PermissionLevel.VIEW,
                                "admin",
                                "Sample role assignment"
                        );
                        System.out.println("Assigned diagram to viewer role");
                    } catch (Exception e) {
                        if (!e.getMessage().contains("already has access")) {
                            System.err.println("Error assigning to role: " + e.getMessage());
                        }
                    }
                }

                // Assign to Development Team group if it exists
                List<Group> devGroups = groupService.searchGroups("Development Team");
                if (!devGroups.isEmpty()) {
                    try {
                        assignmentService.assignDiagramToGroup(
                                sampleFile.getId(),
                                devGroups.get(0).getId(),
                                DiagramAssignment.PermissionLevel.EDIT,
                                "admin",
                                "Sample group assignment"
                        );
                        System.out.println("Assigned diagram to Development Team group");
                    } catch (Exception e) {
                        if (!e.getMessage().contains("already has access")) {
                            System.err.println("Error assigning to group: " + e.getMessage());
                        }
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("Error in createSampleDiagramAssignments: " + e.getMessage());
        }
    }

    // Helper method to create sample BPMN file if none exist
    private void createSampleBpmnFile() {
        try {
            String sampleXml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                                xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                                xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                                xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                                id="Definitions_1" 
                                targetNamespace="http://bpmn.io/schema/bpmn">
                  <bpmn:process id="Process_1" isExecutable="true">
                    <bpmn:startEvent id="StartEvent_1"/>
                    <bpmn:task id="Task_1" name="Sample Task"/>
                    <bpmn:endEvent id="EndEvent_1"/>
                    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
                    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
                  </bpmn:process>
                </bpmn:definitions>
                """;

            File sampleFile = new File("Sample Process Diagram", "bpmn", sampleXml);
            sampleFile.setCreatedBy("admin");
            sampleFile.setUpdatedBy("admin");
            sampleFile.setDescription("Sample BPMN diagram for testing RBAC");
            sampleFile.setUploadTime(LocalDateTime.now());
            sampleFile.setUpdatedTime(LocalDateTime.now());

            fileRepository.save(sampleFile);
            System.out.println("Created sample BPMN file for testing");

        } catch (Exception e) {
            System.err.println("Error creating sample BPMN file: " + e.getMessage());
        }
    }
}