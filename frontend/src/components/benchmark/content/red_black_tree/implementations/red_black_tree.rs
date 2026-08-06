use std::rc::Rc;
use std::cell::RefCell;
use std::fmt;

#[derive(Clone, Debug, PartialEq)]
enum Color {
    Red,
    Black,
}

struct Node {
    key: i32,
    color: Color,
    left: Link,
    right: Link,
    parent: Link,
}

type Link = Option<Rc<RefCell<Node>>>;

impl Node {
    fn new(key: i32) -> Self {
        Node {
            key,
            color: Color::Red,
            left: None,
            right: None,
            parent: None,
        }
    }

    fn new_nil() -> Self {
        Node {
            key: 0,
            color: Color::Black,
            left: None,
            right: None,
            parent: None,
        }
    }
}

pub struct RedBlackTree {
    root: Link,
    nil: Link,
}

impl RedBlackTree {
    pub fn new() -> Self {
        let nil = Rc::new(RefCell::new(Node::new_nil()));
        RedBlackTree {
            root: Some(Rc::clone(&nil)),
            nil: Some(nil),
        }
    }

    fn get_root(&self) -> Link {
        self.root.clone()
    }

    fn get_nil(&self) -> Link {
        self.nil.clone()
    }

    fn is_nil(&self, node: &Link) -> bool {
        if let Some(n) = node {
            if let Some(nil) = &self.nil {
                return Rc::ptr_eq(n, nil);
            }
        }
        false
    }

    fn left_rotate(&mut self, x: Link) {
        let x_node = x.as_ref().unwrap();
        let y = x_node.borrow().right.clone();
        let y_node = y.as_ref().unwrap();

        // Set x's right to y's left
        let y_left = y_node.borrow().left.clone();
        x_node.borrow_mut().right = y_left.clone();
        if let Some(y_left_node) = y_left {
            y_left_node.borrow_mut().parent = x.clone();
        }

        // Set y's parent to x's parent
        let x_parent = x_node.borrow().parent.clone();
        y_node.borrow_mut().parent = x_parent.clone();

        // Update parent's child pointer
        if let Some(parent) = x_parent {
            if Rc::ptr_eq(&x.as_ref().unwrap(), &parent.borrow().left.as_ref().unwrap()) {
                parent.borrow_mut().left = y.clone();
            } else {
                parent.borrow_mut().right = y.clone();
            }
        } else {
            self.root = y.clone();
        }

        // Set y's left to x
        y_node.borrow_mut().left = x.clone();
        x_node.borrow_mut().parent = y.clone();
    }

    fn right_rotate(&mut self, x: Link) {
        let x_node = x.as_ref().unwrap();
        let y = x_node.borrow().left.clone();
        let y_node = y.as_ref().unwrap();

        // Set x's left to y's right
        let y_right = y_node.borrow().right.clone();
        x_node.borrow_mut().left = y_right.clone();
        if let Some(y_right_node) = y_right {
            y_right_node.borrow_mut().parent = x.clone();
        }

        // Set y's parent to x's parent
        let x_parent = x_node.borrow().parent.clone();
        y_node.borrow_mut().parent = x_parent.clone();

        // Update parent's child pointer
        if let Some(parent) = x_parent {
            if Rc::ptr_eq(&x.as_ref().unwrap(), &parent.borrow().left.as_ref().unwrap()) {
                parent.borrow_mut().left = y.clone();
            } else {
                parent.borrow_mut().right = y.clone();
            }
        } else {
            self.root = y.clone();
        }

        // Set y's right to x
        y_node.borrow_mut().right = x.clone();
        x_node.borrow_mut().parent = y.clone();
    }

    fn insert_fixup(&mut self, mut z: Link) {
        let nil = self.get_nil();
        while let Some(z_node) = z.clone() {
            let parent = z_node.borrow().parent.clone();
            if let Some(p) = parent {
                if p.borrow().color == Color::Red {
                    let grandparent = p.borrow().parent.clone();
                    if let Some(gp) = grandparent {
                        if Rc::ptr_eq(&p, &gp.borrow().left.as_ref().unwrap()) {
                            let y = gp.borrow().right.clone();
                            if let Some(y_node) = y {
                                if y_node.borrow().color == Color::Red {
                                    p.borrow_mut().color = Color::Black;
                                    y_node.borrow_mut().color = Color::Black;
                                    gp.borrow_mut().color = Color::Red;
                                    z = Some(gp.clone());
                                } else {
                                    if Rc::ptr_eq(&z_node, &p.borrow().right.as_ref().unwrap()) {
                                        z = Some(p.clone());
                                        self.left_rotate(z.clone());
                                    }
                                    let z_node = z.as_ref().unwrap();
                                    let p = z_node.borrow().parent.clone().unwrap();
                                    let gp = p.borrow().parent.clone().unwrap();
                                    p.borrow_mut().color = Color::Black;
                                    gp.borrow_mut().color = Color::Red;
                                    self.right_rotate(Some(gp.clone()));
                                }
                            }
                        } else {
                            let y = gp.borrow().left.clone();
                            if let Some(y_node) = y {
                                if y_node.borrow().color == Color::Red {
                                    p.borrow_mut().color = Color::Black;
                                    y_node.borrow_mut().color = Color::Black;
                                    gp.borrow_mut().color = Color::Red;
                                    z = Some(gp.clone());
                                } else {
                                    if Rc::ptr_eq(&z_node, &p.borrow().left.as_ref().unwrap()) {
                                        z = Some(p.clone());
                                        self.right_rotate(z.clone());
                                    }
                                    let z_node = z.as_ref().unwrap();
                                    let p = z_node.borrow().parent.clone().unwrap();
                                    let gp = p.borrow().parent.clone().unwrap();
                                    p.borrow_mut().color = Color::Black;
                                    gp.borrow_mut().color = Color::Red;
                                    self.left_rotate(Some(gp.clone()));
                                }
                            }
                        }
                    }
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        if let Some(root) = &self.root {
            root.borrow_mut().color = Color::Black;
        }
    }

    pub fn insert(&mut self, key: i32) {
        let z = Rc::new(RefCell::new(Node::new(key)));
        let nil = self.get_nil();
        z.borrow_mut().left = nil.clone();
        z.borrow_mut().right = nil.clone();

        let mut y = None;
        let mut x = self.root.clone();

        while let Some(x_node) = x.clone() {
            y = Some(x_node.clone());
            if z.borrow().key < x_node.borrow().key {
                x = x_node.borrow().left.clone();
            } else {
                x = x_node.borrow().right.clone();
            }
        }

        z.borrow_mut().parent = y.clone();

        if let Some(y_node) = y {
            if z.borrow().key < y_node.borrow().key {
                y_node.borrow_mut().left = Some(z.clone());
            } else {
                y_node.borrow_mut().right = Some(z.clone());
            }
        } else {
            self.root = Some(z.clone());
        }

        self.insert_fixup(Some(z.clone()));
    }

    fn transplant(&mut self, u: Link, v: Link) {
        if let Some(u_node) = u {
            let parent = u_node.borrow().parent.clone();
            if let Some(p) = parent {
                if Rc::ptr_eq(&u_node, &p.borrow().left.as_ref().unwrap()) {
                    p.borrow_mut().left = v.clone();
                } else {
                    p.borrow_mut().right = v.clone();
                }
            } else {
                self.root = v.clone();
            }
            if let Some(v_node) = v.clone() {
                v_node.borrow_mut().parent = parent;
            }
        }
    }

    fn minimum(&self, mut node: Link) -> Link {
        let nil = self.get_nil();
        while let Some(n) = node.clone() {
            if Rc::ptr_eq(&n.borrow().left.as_ref().unwrap_or(&self.nil.as_ref().unwrap().clone()), &nil.as_ref().unwrap()) {
                break;
            }
            node = n.borrow().left.clone();
        }
        node
    }

    fn delete_fixup(&mut self, mut x: Link) {
        let nil = self.get_nil();
        while let Some(x_node) = x.clone() {
            if Rc::ptr_eq(&x_node, &self.root.as_ref().unwrap()) || x_node.borrow().color == Color::Red {
                break;
            }

            let parent = x_node.borrow().parent.clone();
            if let Some(p) = parent {
                if Rc::ptr_eq(&x_node, &p.borrow().left.as_ref().unwrap()) {
                    let mut w = p.borrow().right.clone();
                    if let Some(w_node) = w.clone() {
                        if w_node.borrow().color == Color::Red {
                            w_node.borrow_mut().color = Color::Black;
                            p.borrow_mut().color = Color::Red;
                            self.left_rotate(Some(p.clone()));
                            w = p.borrow().right.clone();
                        }
                        let w_node = w.as_ref().unwrap();
                        let left_color = if let Some(left) = w_node.borrow().left.clone() {
                            left.borrow().color.clone()
                        } else {
                            Color::Black
                        };
                        let right_color = if let Some(right) = w_node.borrow().right.clone() {
                            right.borrow().color.clone()
                        } else {
                            Color::Black
                        };
                        if left_color == Color::Black && right_color == Color::Black {
                            w_node.borrow_mut().color = Color::Red;
                            x = Some(p.clone());
                        } else {
                            if right_color == Color::Black {
                                let left = w_node.borrow().left.clone();
                                if let Some(left_node) = left {
                                    left_node.borrow_mut().color = Color::Black;
                                }
                                w_node.borrow_mut().color = Color::Red;
                                self.right_rotate(w.clone());
                                w = p.borrow().right.clone();
                            }
                            let w_node = w.as_ref().unwrap();
                            let p_clone = p.clone();
                            w_node.borrow_mut().color = p_clone.borrow().color.clone();
                            p_clone.borrow_mut().color = Color::Black;
                            if let Some(right) = w_node.borrow().right.clone() {
                                right.borrow_mut().color = Color::Black;
                            }
                            self.left_rotate(Some(p_clone.clone()));
                            x = self.root.clone();
                        }
                    }
                } else {
                    let mut w = p.borrow().left.clone();
                    if let Some(w_node) = w.clone() {
                        if w_node.borrow().color == Color::Red {
                            w_node.borrow_mut().color = Color::Black;
                            p.borrow_mut().color = Color::Red;
                            self.right_rotate(Some(p.clone()));
                            w = p.borrow().left.clone();
                        }
                        let w_node = w.as_ref().unwrap();
                        let left_color = if let Some(left) = w_node.borrow().left.clone() {
                            left.borrow().color.clone()
                        } else {
                            Color::Black
                        };
                        let right_color = if let Some(right) = w_node.borrow().right.clone() {
                            right.borrow().color.clone()
                        } else {
                            Color::Black
                        };
                        if right_color == Color::Black && left_color == Color::Black {
                            w_node.borrow_mut().color = Color::Red;
                            x = Some(p.clone());
                        } else {
                            if left_color == Color::Black {
                                let right = w_node.borrow().right.clone();
                                if let Some(right_node) = right {
                                    right_node.borrow_mut().color = Color::Black;
                                }
                                w_node.borrow_mut().color = Color::Red;
                                self.left_rotate(w.clone());
                                w = p.borrow().left.clone();
                            }
                            let w_node = w.as_ref().unwrap();
                            let p_clone = p.clone();
                            w_node.borrow_mut().color = p_clone.borrow().color.clone();
                            p_clone.borrow_mut().color = Color::Black;
                            if let Some(left) = w_node.borrow().left.clone() {
                                left.borrow_mut().color = Color::Black;
                            }
                            self.right_rotate(Some(p_clone.clone()));
                            x = self.root.clone();
                        }
                    }
                }
            }
        }
        if let Some(x_node) = x {
            x_node.borrow_mut().color = Color::Black;
        }
    }

    pub fn delete(&mut self, key: i32) {
        let z = self.search(self.root.clone(), key);
        if self.is_nil(&z) {
            return;
        }

        let mut y = z.clone();
        let y_original_color = y.as_ref().unwrap().borrow().color.clone();
        let x: Link;

        let z_node = z.as_ref().unwrap();
        let nil = self.get_nil();
        if self.is_nil(&z_node.borrow().left) {
            x = z_node.borrow().right.clone();
            self.transplant(z.clone(), x.clone());
        } else if self.is_nil(&z_node.borrow().right) {
            x = z_node.borrow().left.clone();
            self.transplant(z.clone(), x.clone());
        } else {
            y = self.minimum(z_node.borrow().right.clone());
            let y_node = y.as_ref().unwrap();
            let y_orig_color = y_node.borrow().color.clone();
            x = y_node.borrow().right.clone();

            let z_clone = z.clone();
            let y_parent = y_node.borrow().parent.clone();
            if let Some(yp) = y_parent {
                if Rc::ptr_eq(&y_node, &yp.borrow().left.as_ref().unwrap()) {
                    // y is left child
                }
            }

            if Rc::ptr_eq(&y_node, &z_node) {
                if let Some(x_node) = x.clone() {
                    x_node.borrow_mut().parent = Some(y_node.clone());
                }
            } else {
                self.transplant(y.clone(), y_node.borrow().right.clone());
                let y_node = y.as_ref().unwrap();
                y_node.borrow_mut().right = z_node.borrow().right.clone();
                if let Some(right) = y_node.borrow().right.clone() {
                    right.borrow_mut().parent = Some(y_node.clone());
                }
            }

            self.transplant(z.clone(), y.clone());
            let y_node = y.as_ref().unwrap();
            y_node.borrow_mut().left = z_node.borrow().left.clone();
            if let Some(left) = y_node.borrow().left.clone() {
                left.borrow_mut().parent = Some(y_node.clone());
            }
            y_node.borrow_mut().color = z_node.borrow().color.clone();

            if y_original_color == Color::Black {
                self.delete_fixup(x.clone());
            }
        }
    }

    fn search(&self, node: Link, key: i32) -> Link {
        let nil = self.get_nil();
        if let Some(n) = node {
            if self.is_nil(&Some(n.clone())) || n.borrow().key == key {
                return Some(n.clone());
            }
            if key < n.borrow().key {
                return self.search(n.borrow().left.clone(), key);
            } else {
                return self.search(n.borrow().right.clone(), key);
            }
        }
        nil
    }

    pub fn search_key(&self, key: i32) -> bool {
        !self.is_nil(&self.search(self.root.clone(), key))
    }

    fn inorder_traversal(&self, node: Link, result: &mut Vec<i32>) {
        let nil = self.get_nil();
        if let Some(n) = node {
            if self.is_nil(&Some(n.clone())) {
                return;
            }
            self.inorder_traversal(n.borrow().left.clone(), result);
            result.push(n.borrow().key);
            self.inorder_traversal(n.borrow().right.clone(), result);
        }
    }

    pub fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        self.inorder_traversal(self.root.clone(), &mut result);
        result
    }
}