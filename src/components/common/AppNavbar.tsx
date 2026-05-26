import React from "react";
import { ActionIcon, Button, Group, Text } from "@mantine/core";
import { IconLogout, IconMoon, IconSun } from "@tabler/icons-react";

type AppNavbarProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
};

const AppNavbar: React.FC<AppNavbarProps> = ({ isDark, onToggleTheme, onLogout }) => {
  return (
    <header
      className="sticky top-0 z-20 border-b px-6 py-3 backdrop-blur"
      style={{
        borderColor: "var(--mantine-color-default-border)",
        backgroundColor: "color-mix(in srgb, var(--mantine-color-body) 92%, transparent)",
      }}
    >
      <Group justify="space-between" align="center">
        <Text fw={700} size="lg" c="var(--mantine-color-text)">
          Clearest Health
        </Text>

        <Group gap="sm">
          <ActionIcon
            variant="light"
            color="teal"
            radius="xl"
            size="lg"
            onClick={onToggleTheme}
            aria-label="Toggle color scheme"
          >
            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>

          <Button variant="light" color="gray" leftSection={<IconLogout size={16} />} onClick={onLogout}>
            Logout
          </Button>
        </Group>
      </Group>
    </header>
  );
};

export default AppNavbar;
