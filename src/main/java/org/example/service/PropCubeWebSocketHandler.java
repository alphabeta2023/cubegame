package org.example.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.dto.PropCube;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;  // 新增注解
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// 声明为Spring组件（Bean）
@Component
public class PropCubeWebSocketHandler extends TextWebSocketHandler {
    private static final Set<WebSocketSession> sessions =
            Collections.newSetFromMap(new ConcurrentHashMap<>());
    private static final ObjectMapper objectMapper = new ObjectMapper();

    // 现在可以在Spring Bean中正常使用@Autowired
    @Autowired
    private PropCubeService propCubeService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode jsonNode = objectMapper.readTree(message.getPayload());

        if ("DELETE_PROP".equals(jsonNode.get("type").asText())) {
            Long propId = jsonNode.get("id").asLong();
            boolean deleted = propCubeService.deletePropCubeById(propId);
            if (deleted) {
                broadcastPropDeletion(propId);
            }
        }
    }

    // 广播新增道具
    public static void broadcastPropCube(PropCube propCube) {
        try {
            String json = objectMapper.writeValueAsString(propCube);
            TextMessage message = new TextMessage(json);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // 广播删除道具
    public static void broadcastPropDeletion(Long propId) {
        try {
            String json = objectMapper.writeValueAsString(new DeleteMessage(propId));
            TextMessage message = new TextMessage(json);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // 内部删除消息实体
    private static class DeleteMessage {
        private String type = "DELETE_PROP";
        private Long id;

        public DeleteMessage(Long id) {
            this.id = id;
        }

        // getter方法（序列化需要）
        public String getType() { return type; }
        public Long getId() { return id; }
    }
}