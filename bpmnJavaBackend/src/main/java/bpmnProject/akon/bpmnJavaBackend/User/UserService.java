package bpmnProject.akon.bpmnJavaBackend.User;

import bpmnProject.akon.bpmnJavaBackend.Auth.RegisterRequest;
import bpmnProject.akon.bpmnJavaBackend.DtoClasses.RoleDto;
import bpmnProject.akon.bpmnJavaBackend.DtoClasses.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static java.util.Arrays.stream;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.out.println("Loading user by username: " + username);

        User user = userRepository.findByEmailOrUsernameWithRoles(username)
                .orElseThrow(() -> {
                    System.out.println("User not found: " + username);
                    // Debug: Let's see what users exist
                    List<Object[]> allUsers = userRepository.findAllUsernamesAndEmails();
                    System.out.println("Available users in database:");
                    for (Object[] userData : allUsers) {
                        System.out.println("Username: " + userData[0] + ", Email: " + userData[1] + ", Enabled: " + userData[2]);
                    }
                    return new UsernameNotFoundException("User not found: " + username);
                });

        System.out.println("User found: " + user.getUsername() + " with roles: " + user.getRoleNames());
        user.printAccountStatus(); // Debug method
        return user;
    }

    public void changePassword(ChangePasswordRequest request, Principal connectedUser) {
        var user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        // check if the current password is correct
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalStateException("Wrong password");
        }
        // check if the two new passwords are the same
        if (!request.getNewPassword().equals(request.getConfirmationPassword())) {
            throw new IllegalStateException("Password are not the same");
        }

        // update the password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        // save the new password
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(Principal connectedUser) {
        var user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();
        var userWithRoles = userRepository.findByEmailOrUsernameWithRoles(user.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return convertToDto(userWithRoles);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return convertToDto(user);
    }

    @Transactional
    public UserDto updateUserRoles(Integer userId, Set<String> roleNames) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Set<Role> roles = roleNames.stream()
                .map(roleName -> {
                    // Αν το role name δεν αρχίζει με ROLE_, πρόσθεσέ το
                    String fullRoleName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName.toUpperCase();
                    return roleRepository.findByName(fullRoleName)
                            .orElseThrow(() -> new RuntimeException("Role not found: " + fullRoleName));
                })
                .collect(Collectors.toSet());

        user.setRoles(roles);
        User savedUser = userRepository.save(user);

        System.out.println("Updated user roles for " + user.getUsername() + ": " + savedUser.getRoleNames());

        return convertToDto(savedUser);
    }

    @Transactional
    public UserDto assignRoleToUser(Integer userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String fullRoleName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName.toUpperCase();

        Role role = roleRepository.findByName(fullRoleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + fullRoleName));

        user.getRoles().add(role);
        User savedUser = userRepository.save(user);

        System.out.println("Added role " + role.getName() + " to user " + user.getUsername());

        return convertToDto(savedUser);
    }

    @Transactional
    public UserDto removeRoleFromUser(Integer userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String fullRoleName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName.toUpperCase();
        Role role = roleRepository.findByName(fullRoleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + fullRoleName));

        user.getRoles().remove(role);
        User savedUser = userRepository.save(user);
        System.out.println("Removed role " + role.getName() + " from user " + user.getUsername());
        return convertToDto(savedUser);
    }

    public void deleteUser(Integer userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(userId);
    }

    @Transactional(readOnly = true)
    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::convertToRoleDto)
                .collect(Collectors.toList());
    }

    private UserDto convertToDto(User user) {
        Set<RoleDto> roleDtos = user.getRoles().stream()
                .map(this::convertToRoleDto)
                .collect(Collectors.toSet());

        return UserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstname())
                .lastName(user.getLastname())
                .email(user.getEmail())
                .roles(roleDtos)
                .build();
    }

    private RoleDto convertToRoleDto(Role role) {
        return RoleDto.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .build();
    }
}