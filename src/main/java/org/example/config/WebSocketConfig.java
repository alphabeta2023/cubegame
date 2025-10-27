package org.example.config;

import org.example.service.PropCubeWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    // 注入Spring管理的PropCubeWebSocketHandler Bean
    private final PropCubeWebSocketHandler propCubeWebSocketHandler;

    // 构造方法注入（推荐，替代字段注入）
    public WebSocketConfig(PropCubeWebSocketHandler propCubeWebSocketHandler) {
        this.propCubeWebSocketHandler = propCubeWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 注册WebSocket处理器，映射路径并允许跨域
        registry.addHandler(propCubeWebSocketHandler, "/ws/propcubes")
                .setAllowedOrigins("*"); // 生产环境需限制 origins
    }
}