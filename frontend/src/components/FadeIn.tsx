import { motion } from "framer-motion";
import type { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

/**
 * Reusable scroll-in animation wrapper. Fades + slides content up as it
 * enters the viewport. Used across sections instead of duplicating
 * motion.div boilerplate everywhere.
 */
export default function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
}: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
