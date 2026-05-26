import React from "react";
import { ActionIcon, Button, Group, Text } from "@mantine/core";
import {
  IconFileText,
  IconHome,
  IconLogout,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { NavLink } from "react-router-dom";

type SidebarProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
};

const navBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

const Sidebar: React.FC<SidebarProps> = ({
  isDark,
  onToggleTheme,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-[#c1c9be] bg-[#ffffff] p-6 md:flex md:flex-col dark:border-[#414941] dark:bg-[#19221a]">
          <div>
            <Text
              fw={700}
              fz={40}
              lh={1}
              style={{ color: "light-dark(#0B3D1B, #9fd3a4)" }}
            >
              C
            </Text>
            <Text
              fw={700}
              size="xl"
              lh={1.1}
              style={{ color: "light-dark(#00260c, #f0f1f0)" }}
            >
              Clearest Health
            </Text>
            <Text size="sm" style={{ color: "light-dark(#414941, #c1c9be)" }}>
              Admin Console
            </Text>
          </div>

          <nav className="mt-10 flex flex-col gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${navBase} ${
                  isActive
                    ? "border-l-3 border-[#0B3D1B] bg-[#eef4ee] text-[#00260c] dark:border-[#9fd3a4] dark:bg-[#2e372e] dark:text-[#f0f1f0]"
                    : "text-[#414941] hover:bg-[#f3f4f3] dark:text-[#c1c9be] dark:hover:bg-[#2e3131]"
                }`
              }
            >
              <IconHome size={18} />
              Home
            </NavLink>
            <NavLink
              to="/mrf-files"
              className={({ isActive }) =>
                `${navBase} ${
                  isActive
                    ? "border-l-3 border-[#0B3D1B] bg-[#eef4ee] text-[#00260c] dark:border-[#9fd3a4] dark:bg-[#2e372e] dark:text-[#f0f1f0]"
                    : "text-[#414941] hover:bg-[#f3f4f3] dark:text-[#c1c9be] dark:hover:bg-[#2e3131]"
                }`
              }
            >
              <IconFileText size={18} />
              MRF Files
            </NavLink>
          </nav>
        </aside>

        <main className="flex h-screen min-h-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#c1c9be] bg-[#ffffff]/90 px-6 py-3 backdrop-blur dark:border-[#414941] dark:bg-[#2e3131]/90">
            <Group justify="flex-end">
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
              <Button
                variant="light"
                color="gray"
                leftSection={<IconLogout size={16} />}
                onClick={onLogout}
              >
                Logout
              </Button>
            </Group>
          </header>

          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
