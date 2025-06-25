package bpmnProject.akon.bpmnJavaBackend.Auth;

import bpmnProject.akon.bpmnJavaBackend.Config.JwtService;
import bpmnProject.akon.bpmnJavaBackend.Token.Token;
import bpmnProject.akon.bpmnJavaBackend.Token.TokenRepository;
import bpmnProject.akon.bpmnJavaBackend.Token.TokenType;
import bpmnProject.akon.bpmnJavaBackend.User.Role;
import bpmnProject.akon.bpmnJavaBackend.User.RoleRepository;
import bpmnProject.akon.bpmnJavaBackend.User.User;
import bpmnProject.akon.bpmnJavaBackend.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final UserRepository repository;
    private final RoleRepository roleRepository;
    private final TokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        // Check if user already exists
        if (repository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("User with email " + request.getEmail() + " already exists");
        }

        if (request.getUsername() != null && repository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username " + request.getUsername() + " already exists");
        }

        // Get roles from role names - fetch from database to ensure managed entities
        Set<Role> roles = new HashSet<>();
        if (request.getRoleNames() != null && !request.getRoleNames().isEmpty()) {
            System.out.println("Assigning roles: " + request.getRoleNames());
            for (String roleName : request.getRoleNames()) {
                String fullRoleName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
                roles.add(role);
            }
        } else {
            System.out.println("No roles specified, assigning default viewer role");
            // Default role if none specified
            Role viewerRole = roleRepository.findByName(Role.ROLE_VIEWER)
                    .orElseThrow(() -> new RuntimeException("Default role not found"));
            roles.add(viewerRole);
        }

        // Create user without cascading role operations
        var user = User.builder()
                .firstname(request.getFirstName())
                .lastname(request.getLastName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(new HashSet<>())
                .tokens(new ArrayList<>())
                .build();

        // Save user first
        var savedUser = repository.save(user);

        // Now add roles to the saved user
        savedUser.setRoles(roles);

        // Save again with roles
        savedUser = repository.save(savedUser);

        // Generate access token with roles
        var jwtToken = generateAccessToken(savedUser);
        System.out.println("User created with roles: " + savedUser.getRoleNames());
        saveUserToken(savedUser, jwtToken);

        return buildAuthResponse(jwtToken, null, savedUser);
    }

    @Transactional
    public AuthenticationResponse authenticate(LoginRequest request) {
        System.out.println("Authenticating user: " + request.getUsername());

        try {
            var auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            var user = (User) auth.getPrincipal();
            System.out.println("Authentication successful, loading user with roles...");

            // Φόρτωση χρήστη με roles από τη βάση δεδομένων
            var userWithRoles = repository.findByEmailOrUsernameWithRoles(user.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found after authentication"));

            System.out.println("User loaded with roles: " + userWithRoles.getRoleNames());

            // Revoke all existing tokens to prevent multiple active sessions
            revokeAllUserTokens(userWithRoles);

            // Generate new access token with roles
            var jwtToken = generateAccessToken(userWithRoles);

            // Save the new access token
            saveUserToken(userWithRoles, jwtToken);

            System.out.println("Authentication successful for user: " + userWithRoles.getUsername());
            System.out.println("User roles: " + userWithRoles.getRoleNames());

            return buildAuthResponse(jwtToken, null, userWithRoles);

        } catch (Exception e) {
            System.err.println("Authentication failed for user: " + request.getUsername() + " - " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Simplified refresh token method - you can implement later if needed
    @Transactional
    public AuthenticationResponse refreshToken(String refreshToken) {
        // For now, just return an error - implement later when you add refresh token support
        throw new RuntimeException("Refresh token functionality not implemented yet");
    }

    @Transactional
    public void logout(String token) {
        var storedToken = tokenRepository.findByToken(token).orElse(null);
        if (storedToken != null) {
            storedToken.setExpired(true);
            storedToken.setRevoked(true);
            tokenRepository.save(storedToken);
        }
    }

    public boolean validateToken(String token) {
        try {
            var storedToken = tokenRepository.findByToken(token);
            if (storedToken.isPresent()) {
                var tokenEntity = storedToken.get();
                if (tokenEntity.isExpired() || tokenEntity.isRevoked()) {
                    return false;
                }

                String username = jwtService.extractUsername(token);
                var userDetails = userDetailsService.loadUserByUsername(username);
                return jwtService.isTokenValid(token, userDetails);
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private String generateAccessToken(User user) {
        Map<String, Object> extraClaims = new HashMap<>();
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            extraClaims.put("roles", user.getRoles().stream()
                    .map(Role::getName)
                    .toList());
        }
        extraClaims.put("userId", user.getId());
        extraClaims.put("email", user.getEmail());

        return jwtService.generateToken(extraClaims, user);
    }

    private AuthenticationResponse buildAuthResponse(String accessToken, String refreshToken, User user) {
        long expirationTime = jwtService.extractExpiration(accessToken).getTime();
        long currentTime = System.currentTimeMillis();
        long expiresInSeconds = (expirationTime - currentTime) / 1000;

        return AuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken) // Will be null for now
                .tokenType("Bearer")
                .user(user)
                .expiresIn(expiresInSeconds)
                .build();
    }

    private void saveUserToken(User user, String jwtToken) {
        var token = Token.builder()
                .user(user)
                .token(jwtToken)
                .tokenType(TokenType.BEARER)
                .expired(false)
                .revoked(false)
                .build();
        tokenRepository.save(token);
    }

    @Transactional
    private void revokeAllUserTokens(User user) {
        var validUserTokens = tokenRepository.findAllValidTokenByUser(user.getId());
        if (validUserTokens.isEmpty()) {
            return;
        }

        validUserTokens.forEach(token -> {
            token.setExpired(true);
            token.setRevoked(true);
        });

        tokenRepository.saveAll(validUserTokens);
        tokenRepository.flush();
    }
}