// MapData.java
package org.example.dto;

import javax.persistence.*;

@Entity
@Table(name = "user_map_data")
public class MapData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double z;

    @Column(nullable = false)
    private String color;

    // 新增size字段
    @Column(nullable = false)
    private double size;

    @Column(name = "render_order", nullable = false)
    private int renderOrder;

    // 构造函数
    public MapData() {}

    // 新增size参数的构造函数
    public MapData(String username, double x, double z, String color, double size) {
        this.username = username;
        this.x = x;
        this.z = z;
        this.color = color;
        this.size = size;
    }

    // Getters and Setters（新增size的getter和setter）
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getZ() { return z; }
    public void setZ(double z) { this.z = z; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public double getSize() { return size; }
    public void setSize(double size) { this.size = size; }

    public int getRenderOrder() {
        return renderOrder;
    }

    public void setRenderOrder(int renderOrder) {
        this.renderOrder = renderOrder;
    }
}