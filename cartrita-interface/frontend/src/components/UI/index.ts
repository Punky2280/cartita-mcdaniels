// Cartrita Design System Components
// Comprehensive component library for the Cartrita Interface

// Core Components
export { default as Button } from './Button';
export { default as Card, CardHeader, CardContent, CardFooter } from './Card';
export { default as Input, Textarea, SearchInput, PasswordInput } from './Input';
export { default as Badge, StatusBadge, PriorityBadge } from './Badge';
export { default as Modal, ModalHeader, ModalContent, ModalFooter, ConfirmModal } from './Modal';

// Legacy exports for backward compatibility
export { default as LoadingSpinner } from './LoadingSpinner';

// Type exports
export type {
  // Component prop types can be exported here if needed
} from './Button';

// Re-export everything as CartritaUI namespace
import Button from './Button';
import Card, { CardHeader, CardContent, CardFooter } from './Card';
import Input, { Textarea, SearchInput, PasswordInput } from './Input';
import Badge, { StatusBadge, PriorityBadge } from './Badge';
import Modal, { ModalHeader, ModalContent, ModalFooter, ConfirmModal } from './Modal';
import LoadingSpinner from './LoadingSpinner';

export const CartritaUI = {
  Button,
  Card: Object.assign(Card, {
    Header: CardHeader,
    Content: CardContent,
    Footer: CardFooter,
  }),
  Input: Object.assign(Input, {
    Textarea,
    Search: SearchInput,
    Password: PasswordInput,
  }),
  Badge: Object.assign(Badge, {
    Status: StatusBadge,
    Priority: PriorityBadge,
  }),
  Modal: Object.assign(Modal, {
    Header: ModalHeader,
    Content: ModalContent,
    Footer: ModalFooter,
    Confirm: ConfirmModal,
  }),
  LoadingSpinner,
};

export default CartritaUI;