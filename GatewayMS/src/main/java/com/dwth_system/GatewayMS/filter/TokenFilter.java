package com.dwth_system.GatewayMS.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

@Component
public class TokenFilter extends AbstractGatewayFilterFactory<TokenFilter.Config> {

    private static final String SECRET = "78896b3fc153477f992cea6f88a352eb36fa282305ab23105ed4ddf7e6fae46670477695b747c1b2422e4738605fd3ebf0d40b9eeed7e024f592435b3cb08aeb";

    public TokenFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {

            // Handle preflight OPTIONS here: respond immediately with CORS headers
            if (exchange.getRequest().getMethod() == HttpMethod.OPTIONS) {
                exchange.getResponse().getHeaders().add("Access-Control-Allow-Origin", "http://localhost:5173");
                exchange.getResponse().getHeaders().add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
                exchange.getResponse().getHeaders().add("Access-Control-Allow-Headers", "Authorization,Content-Type");
                exchange.getResponse().getHeaders().add("Access-Control-Allow-Credentials", "true");
                exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.OK);
                return exchange.getResponse().setComplete();
            }

            // Add your custom logic here
            String path = exchange.getRequest().getPath().toString();
            System.out.println("Path: " + path);
            if (path.equals("/user/login") || path.equals("/user/register") || path.equals("/user/refresh-token")) {

                return chain.filter(exchange.mutate().request(r -> r.header("X-Secret-Key", "SECRET")).build());
            }
            HttpHeaders header = exchange.getRequest().getHeaders();
            if (!header.containsKey(HttpHeaders.AUTHORIZATION)) {
                throw new RuntimeException("Authorization header is missing");
            }
            String authHeader = header.getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new RuntimeException("Authorization header is not valid");
            }
            String token = authHeader.substring(7);
            try {
                Claims claims = Jwts.parser().setSigningKey(SECRET).build().parseClaimsJws(token).getBody();
                exchange = exchange.mutate().request(r -> r.header("X-Secret-Key", "SECRET")).build();

            } catch (Exception e) {
                throw new RuntimeException("Token is not valid");
            }
            return chain.filter(exchange);
        };
    }

    public static class Config {
    }
}
