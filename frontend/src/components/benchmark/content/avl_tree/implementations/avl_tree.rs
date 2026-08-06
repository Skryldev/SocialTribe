use std::cmp::max;
use std::cell::RefCell;
use std::rc::Rc;

type NodeRef = Option<Rc<RefCell<AVLNode>>>;

struct AVLNode {
    key: i32,
    left: NodeRef,
    right: NodeRef,
    height: usize,
}

impl AVLNode {
    fn new(key: i32) -> Self {
        AVLNode {
            key,
            left: None,
            right: None,
            height: 1,
        }
    }
}

pub struct AVLTree {
    root: NodeRef,
}

impl AVLTree {
    pub fn new() -> Self {
        AVLTree { root: None }
    }

    fn height(node: &NodeRef) -> usize {
        node.as_ref().map_or(0, |n| n.borrow().height)
    }

    fn balance(node: &NodeRef) -> isize {
        node.as_ref().map_or(0, |n| {
            Self::height(&n.borrow().left) as isize - Self::height(&n.borrow().right) as isize
        })
    }

    fn update_height(node: &NodeRef) {
        if let Some(n) = node {
            let left_height = Self::height(&n.borrow().left);
            let right_height = Self::height(&n.borrow().right);
            n.borrow_mut().height = 1 + max(left_height, right_height);
        }
    }

    fn rotate_right(y: NodeRef) -> NodeRef {
        if let Some(y_node) = y {
            let x = y_node.borrow().left.clone();
            let t2 = x.as_ref().and_then(|n| n.borrow().right.clone());
            
            if let Some(x_node) = x.clone() {
                x_node.borrow_mut().right = Some(y_node.clone());
                y_node.borrow_mut().left = t2;
                
                Self::update_height(&Some(y_node.clone()));
                Self::update_height(&Some(x_node.clone()));
                
                return Some(x_node);
            }
        }
        None
    }

    fn rotate_left(x: NodeRef) -> NodeRef {
        if let Some(x_node) = x {
            let y = x_node.borrow().right.clone();
            let t2 = y.as_ref().and_then(|n| n.borrow().left.clone());
            
            if let Some(y_node) = y.clone() {
                y_node.borrow_mut().left = Some(x_node.clone());
                x_node.borrow_mut().right = t2;
                
                Self::update_height(&Some(x_node.clone()));
                Self::update_height(&Some(y_node.clone()));
                
                return Some(y_node);
            }
        }
        None
    }

    pub fn insert(&mut self, key: i32) {
        self.root = Self::insert_node(self.root.clone(), key);
    }

    fn insert_node(node: NodeRef, key: i32) -> NodeRef {
        if let Some(n) = node.clone() {
            let current_key = n.borrow().key;
            
            if key < current_key {
                let new_left = Self::insert_node(n.borrow().left.clone(), key);
                n.borrow_mut().left = new_left;
            } else if key > current_key {
                let new_right = Self::insert_node(n.borrow().right.clone(), key);
                n.borrow_mut().right = new_right;
            } else {
                return node;
            }

            Self::update_height(&node);
            let bal = Self::balance(&node);

            if bal > 1 && key < n.borrow().left.as_ref().unwrap().borrow().key {
                return Self::rotate_right(node);
            }

            if bal < -1 && key > n.borrow().right.as_ref().unwrap().borrow().key {
                return Self::rotate_left(node);
            }

            if bal > 1 && key > n.borrow().left.as_ref().unwrap().borrow().key {
                let left = n.borrow().left.clone();
                let rotated_left = Self::rotate_left(left);
                n.borrow_mut().left = rotated_left;
                return Self::rotate_right(node);
            }

            if bal < -1 && key < n.borrow().right.as_ref().unwrap().borrow().key {
                let right = n.borrow().right.clone();
                let rotated_right = Self::rotate_right(right);
                n.borrow_mut().right = rotated_right;
                return Self::rotate_left(node);
            }

            return node;
        }
        
        Some(Rc::new(RefCell::new(AVLNode::new(key))))
    }

    pub fn delete(&mut self, key: i32) {
        self.root = Self::delete_node(self.root.clone(), key);
    }

    fn delete_node(node: NodeRef, key: i32) -> NodeRef {
        if let Some(n) = node.clone() {
            let current_key = n.borrow().key;
            
            if key < current_key {
                let new_left = Self::delete_node(n.borrow().left.clone(), key);
                n.borrow_mut().left = new_left;
            } else if key > current_key {
                let new_right = Self::delete_node(n.borrow().right.clone(), key);
                n.borrow_mut().right = new_right;
            } else {
                if n.borrow().left.is_none() {
                    return n.borrow().right.clone();
                } else if n.borrow().right.is_none() {
                    return n.borrow().left.clone();
                } else {
                    let min_node = Self::find_min(n.borrow().right.clone());
                    let min_key = min_node.as_ref().unwrap().borrow().key;
                    n.borrow_mut().key = min_key;
                    let new_right = Self::delete_node(n.borrow().right.clone(), min_key);
                    n.borrow_mut().right = new_right;
                }
            }

            Self::update_height(&node);
            let bal = Self::balance(&node);

            if bal > 1 && Self::balance(&n.borrow().left) >= 0 {
                return Self::rotate_right(node);
            }

            if bal > 1 && Self::balance(&n.borrow().left) < 0 {
                let left = n.borrow().left.clone();
                let rotated_left = Self::rotate_left(left);
                n.borrow_mut().left = rotated_left;
                return Self::rotate_right(node);
            }

            if bal < -1 && Self::balance(&n.borrow().right) <= 0 {
                return Self::rotate_left(node);
            }

            if bal < -1 && Self::balance(&n.borrow().right) > 0 {
                let right = n.borrow().right.clone();
                let rotated_right = Self::rotate_right(right);
                n.borrow_mut().right = rotated_right;
                return Self::rotate_left(node);
            }

            return node;
        }
        None
    }

    fn find_min(node: NodeRef) -> NodeRef {
        let mut current = node;
        while let Some(n) = current.clone() {
            if n.borrow().left.is_none() {
                return current;
            }
            current = n.borrow().left.clone();
        }
        current
    }

    pub fn search(&self, key: i32) -> bool {
        Self::search_node(self.root.clone(), key)
    }

    fn search_node(node: NodeRef, key: i32) -> bool {
        if let Some(n) = node {
            let current_key = n.borrow().key;
            if key == current_key {
                return true;
            } else if key < current_key {
                return Self::search_node(n.borrow().left.clone(), key);
            } else {
                return Self::search_node(n.borrow().right.clone(), key);
            }
        }
        false
    }

    pub fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        Self::inorder_traversal(self.root.clone(), &mut result);
        result
    }

    fn inorder_traversal(node: NodeRef, result: &mut Vec<i32>) {
        if let Some(n) = node {
            Self::inorder_traversal(n.borrow().left.clone(), result);
            result.push(n.borrow().key);
            Self::inorder_traversal(n.borrow().right.clone(), result);
        }
    }
}