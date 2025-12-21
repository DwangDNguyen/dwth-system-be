package com.dwth_system.user.jwt;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

@Component
public class JwtUtils {

    // Access token validity: 15 minutes (recommended for production)
    private static final long JWT_TOKEN_VALIDITY = 15 * 60L;

    // Refresh token validity: 7 days
    private static final long REFRESH_TOKEN_VALIDITY = 7 * 24 * 60 * 60L;

    private static final String SECRET = "78896b3fc153477f992cea6f88a352eb36fa282305ab23105ed4ddf7e6fae46670477695b747c1b2422e4738605fd3ebf0d40b9eeed7e024f592435b3cb08aeb";
    SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes());

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        CustomUserDetail user = (CustomUserDetail) userDetails;
        claims.put("id", user.getId());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole());
        claims.put("name", user.getName());
        claims.put("type", "access");
        return createToken(claims, user.getUsername(), JWT_TOKEN_VALIDITY);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        CustomUserDetail user = (CustomUserDetail) userDetails;
        claims.put("id", user.getId());
        claims.put("email", user.getEmail());
        claims.put("type", "refresh");
        return createToken(claims, user.getUsername(), REFRESH_TOKEN_VALIDITY);
    }

    public String createToken(Map<String, Object> claims, String subject, long validity) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + validity * 1000))
                .signWith(SignatureAlgorithm.HS512, SECRET)
                .compact();
    }

    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parser().setSigningKey(SECRET).build().parseClaimsJws(token).getBody();
        return claims.get("email", String.class);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(SECRET).build().parseClaimsJws(token);
            return true;
        } catch (SignatureException e) {
            System.out.println("Invalid JWT signature: " + e.getMessage());
        } catch (MalformedJwtException e) {
            System.out.println("Invalid JWT token: " + e.getMessage());
        } catch (ExpiredJwtException e) {
            System.out.println("JWT token is expired: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.out.println("JWT token is unsupported: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.out.println("JWT claims string is empty: " + e.getMessage());
        }
        return false;
    }

    public Long getTokenValidity() {
        return JWT_TOKEN_VALIDITY;
    }

    public Long getRefreshTokenValidity() {
        return REFRESH_TOKEN_VALIDITY;
    }
}
