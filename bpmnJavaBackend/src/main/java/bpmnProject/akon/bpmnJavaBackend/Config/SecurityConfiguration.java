package bpmnProject.akon.bpmnJavaBackend.Config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfiguration {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final LogoutHandler logoutHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(req ->
                        req
                                // PUBLIC ENDPOINTS
                                .requestMatchers("/api/v1/auth/**").permitAll()
                                .requestMatchers("/api/v1/test/public").permitAll()

                                // SWAGGER ENDPOINTS
                                .requestMatchers("/v2/api-docs").permitAll()
                                .requestMatchers("/v3/api-docs").permitAll()
                                .requestMatchers("/v3/api-docs/**").permitAll()
                                .requestMatchers("/swagger-resources").permitAll()
                                .requestMatchers("/swagger-resources/**").permitAll()
                                .requestMatchers("/configuration/ui").permitAll()
                                .requestMatchers("/configuration/security").permitAll()
                                .requestMatchers("/swagger-ui/**").permitAll()
                                .requestMatchers("/webjars/**").permitAll()
                                .requestMatchers("/swagger-ui.html").permitAll()

                                // DEBUG ENDPOINTS
                                .requestMatchers("/api/v1/debug/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")

                                // RBAC ADMIN ENDPOINTS (NEW)
                                .requestMatchers("/api/v1/admin/role-hierarchy/**").hasRole("ADMIN")

                                // GROUP MANAGEMENT
                                .requestMatchers("/api/v1/groups").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/groups/search").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/groups/my-groups").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/groups/with-user-count").hasRole("ADMIN")
                                .requestMatchers("/api/v1/groups/*/users/**").hasRole("ADMIN")
                                .requestMatchers("/api/v1/groups/**").hasRole("ADMIN")

                                // DIAGRAM ASSIGNMENT ENDPOINTS (NEW)
                                .requestMatchers("/api/v1/diagrams/available-to-user").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/diagrams/*/access").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/diagrams/*/assign/**").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/diagrams/*/assignments").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/diagrams/assignments/**").hasAnyRole("MODELER", "ADMIN")

                                // FOLDER ENDPOINTS - SPECIFIC PATTERNS FIRST
                                .requestMatchers("/api/v1/file/create-folder").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/all/folders").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/folders/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/folders/delete/**").hasRole("ADMIN")
                                .requestMatchers("/api/v1/file/folders/*/subfolders").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/folders/*/files").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/folders/*/breadcrumb").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/folders/*/move").hasAnyRole("MODELER", "ADMIN")

                                // FOLDER ENDPOINTS (alternative mapping)
                                .requestMatchers("/api/v1/folders/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")

                                // FILE ENDPOINTS - SPECIFIC PATTERNS
                                .requestMatchers("/api/v1/file/upload").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/save").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/*/content").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/all").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/root-files").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/delete/**").hasRole("ADMIN")
                                .requestMatchers("/api/v1/file/*/export/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/*/download").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/*/validate").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/*/preview").hasAnyRole("VIEWER", "MODELER", "ADMIN")
                                .requestMatchers("/api/v1/file/*/move-to-folder").hasAnyRole("MODELER", "ADMIN")

                                // GENERAL FILE ENDPOINTS (catch-all for file operations)
                                .requestMatchers("/api/v1/file/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")

                                // TEST ENDPOINTS
                                .requestMatchers("/api/v1/test/admin/**").hasAnyRole("ADMIN")
                                .requestMatchers("/api/v1/test/modeler/**").hasAnyRole("MODELER", "ADMIN")
                                .requestMatchers("/api/v1/test/viewer/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")

                                // MANAGEMENT ENDPOINTS
                                .requestMatchers("/api/v1/management/**").hasAnyRole("ADMIN")

                                // USER ENDPOINTS
                                .requestMatchers("/api/v1/users/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")

                                // SETTINGS ENDPOINTS
                                .requestMatchers("/api/settings/**").hasAnyRole("VIEWER", "MODELER", "ADMIN")

                                // ADMIN ENDPOINTS
                                .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN")

                                // ALL OTHER REQUESTS REQUIRE AUTHENTICATION
                                .anyRequest().authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .logout(logout ->
                        logout.logoutUrl("/api/v1/auth/logout")
                                .addLogoutHandler(logoutHandler)
                                .logoutSuccessHandler((request, response, authentication) -> SecurityContextHolder.clearContext())
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Set specific allowed origins instead of patterns for better security
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));

        // Set allowed methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Set allowed headers - be specific about what we allow
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));

        // Allow credentials
        configuration.setAllowCredentials(true);

        // Set exposed headers
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));

        // Set max age for preflight requests
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}