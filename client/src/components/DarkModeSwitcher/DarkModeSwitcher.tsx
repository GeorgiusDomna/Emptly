import { useState, useEffect } from "react";

import { Button } from "../ui/button";
import { CloudSun, CloudMoon } from "lucide-react";

export const DarkModeSwitcher = () => {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        if (storedTheme) {
            setTheme(storedTheme);
            document.documentElement.setAttribute("data-theme", storedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
        <div>
            <Button onClick={toggleTheme} variant="outline" size="sm">
                {theme === "light" ? <CloudMoon /> : <CloudSun />}
            </Button>
        </div>
    );
}
