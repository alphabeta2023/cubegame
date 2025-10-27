package org.example.dto;

import javax.persistence.*;

@Entity
@Table(name = "game_prop_cube", uniqueConstraints = {
        @UniqueConstraint(columnNames = "index") // 确保index不重复
})
public class PropCube {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "prop_x", nullable = false)),
            @AttributeOverride(name = "y", column = @Column(name = "prop_y", nullable = false)),
            @AttributeOverride(name = "z", column = @Column(name = "prop_z", nullable = false))
    })
    private Position position;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private double size;

    @Column(name = "rotation_speed", nullable = false)
    private double rotationSpeed;

    @Column(nullable = false, unique = true) // 唯一约束
    private int index; // 象限索引

    @Column(name = "username", nullable = false)
    private String username;

    // 初始化时不包含index参数的构造函数
    public PropCube() {}

    public PropCube(Position position, String color, double size, double rotationSpeed, String username) {
        this.position = position;
        this.color = color;
        this.size = size;
        this.rotationSpeed = rotationSpeed;
        this.username = username;
        // 自动计算象限索引
        this.index = calculateIndex(position);
    }

    // 计算象限索引的方法
    private int calculateIndex(Position position) {
        double x = position.getX();
        double z = position.getZ();

        if (x >= 0 && z >= 0) {
            return 1;
        } else if (x < 0 && z > 0) {
            return 2;
        } else if (x < 0 && z < 0) {
            return 3;
        } else {
            return 4;
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Position getPosition() { return position; }
    public void setPosition(Position position) {
        this.position = position;
        // 位置变更时重新计算索引
        this.index = calculateIndex(position);
    }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public double getSize() { return size; }
    public void setSize(double size) { this.size = size; }

    public double getRotationSpeed() { return rotationSpeed; }
    public void setRotationSpeed(double rotationSpeed) { this.rotationSpeed = rotationSpeed; }

    public int getIndex() { return index; }
    // 不提供setIndex方法，确保索引只能通过位置计算

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public void setIndex(int targetQuadrant) { this.index = targetQuadrant; }
}