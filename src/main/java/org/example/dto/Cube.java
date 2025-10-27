package org.example.dto;

import javax.persistence.*;

@Entity
@Table(name = "game_cube")
public class Cube {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 为立方体位置添加前缀
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "cube_x")),
            @AttributeOverride(name = "y", column = @Column(name = "cube_y")),
            @AttributeOverride(name = "z", column = @Column(name = "cube_z"))
    })
    private Position position;

    private String color;
    private double size;

    @Column(name = "username", unique = true) // 添加唯一约束
    private String username;

    @Column(name = "render_order", nullable = false)
    private int renderOrder = 0;

    // 为相机位置添加不同的前缀
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "camera_x")),
            @AttributeOverride(name = "y", column = @Column(name = "camera_y")),
            @AttributeOverride(name = "z", column = @Column(name = "camera_z"))
    })
    private Position cameraPosition;

    private long totalGameSeconds; // 总游戏秒数
    private long remainingSeconds; // 剩余秒数
    private boolean timeExpired; // 时间是否已结束
    private boolean isPaused = false; // 新增：默认不暂停

    public Cube() {
        this.position = new Position();
        this.cameraPosition = new Position(0, 30, 50);
        this.color = "#FFFFFF";
        this.size = 2;
    }

    public Cube(Position position, Position cameraPosition, String color, int size) {
        this.position = position;
        this.cameraPosition = cameraPosition;
        this.color = color;
        this.size = size;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Position getPosition() { return position; }
    public void setPosition(Position position) { this.position = position; }

    public Position getCameraPosition() { return cameraPosition; }
    public void setCameraPosition(Position cameraPosition) { this.cameraPosition = cameraPosition; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public double getSize() { return size; }
    public void setSize(double size) { this.size = size; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public int getRenderOrder() {
        return renderOrder;
    }

    public void setRenderOrder(int renderOrder) {
        this.renderOrder = renderOrder;
    }

    public long getTotalGameSeconds() { return totalGameSeconds; }
    public void setTotalGameSeconds(long totalGameSeconds) { this.totalGameSeconds = totalGameSeconds;}
    public long getRemainingSeconds() { return remainingSeconds; }
    public void setRemainingSeconds(long remainingSeconds) { this.remainingSeconds = remainingSeconds; }
    public boolean isTimeExpired() { return timeExpired; }
    public void setTimeExpired(boolean timeExpired) { this.timeExpired = timeExpired; }

    public boolean isPaused() {
        return isPaused;
    }

    public void setPaused(boolean paused) {
        isPaused = paused;
    }
}