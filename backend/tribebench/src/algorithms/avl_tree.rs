use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct AvlTree;

impl AlgorithmRunner for AvlTree {
    fn aliases(&self) -> &'static [&'static str] {
        &["avl-tree", "avl", "avl-tree-algorithm"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Build array from graph degrees
        // ============================================================
        let arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ AVL Tree Implementation
        // ============================================================
        #[derive(Clone)]
        struct Node {
            value: usize,
            left: Option<Box<Node>>,
            right: Option<Box<Node>>,
            height: usize,
        }

        impl Node {
            fn new(value: usize) -> Self {
                Node {
                    value,
                    left: None,
                    right: None,
                    height: 1,
                }
            }

            fn height(node: &Option<Box<Node>>) -> usize {
                node.as_ref().map_or(0, |n| n.height)
            }

            fn balance_factor(node: &Option<Box<Node>>) -> isize {
                if let Some(n) = node {
                    Self::height(&n.left) as isize - Self::height(&n.right) as isize
                } else {
                    0
                }
            }

            fn update_height(&mut self) {
                self.height = 1 + std::cmp::max(
                    Node::height(&self.left),
                    Node::height(&self.right),
                );
            }

            fn rotate_right(mut node: Box<Node>) -> Box<Node> {
                let mut new_root = node.left.take().unwrap();
                node.left = new_root.right.take();
                node.update_height();
                new_root.right = Some(node);
                new_root.update_height();
                new_root
            }

            fn rotate_left(mut node: Box<Node>) -> Box<Node> {
                let mut new_root = node.right.take().unwrap();
                node.right = new_root.left.take();
                node.update_height();
                new_root.left = Some(node);
                new_root.update_height();
                new_root
            }

            fn insert(node: Option<Box<Node>>, value: usize, operations: &mut u64) -> Option<Box<Node>> {
                let mut node = if let Some(n) = node {
                    *operations += 1;
                    if value < n.value {
                        let left = Self::insert(n.left, value, operations);
                        Node {
                            left,
                            right: n.right,
                            value: n.value,
                            height: n.height,
                        }
                    } else if value > n.value {
                        let right = Self::insert(n.right, value, operations);
                        Node {
                            left: n.left,
                            right,
                            value: n.value,
                            height: n.height,
                        }
                    } else {
                        return Some(n);
                    }
                } else {
                    *operations += 1;
                    return Some(Box::new(Node::new(value)));
                };

                node.update_height();
                *operations += 1;

                let balance = Node::balance_factor(&Some(Box::new(node.clone())));

                // Left-Left case
                if balance > 1 && value < node.left.as_ref().unwrap().value {
                    *operations += 1;
                    return Some(Node::rotate_right(Box::new(node)));
                }

                // Right-Right case
                if balance < -1 && value > node.right.as_ref().unwrap().value {
                    *operations += 1;
                    return Some(Node::rotate_left(Box::new(node)));
                }

                // Left-Right case
                if balance > 1 && value > node.left.as_ref().unwrap().value {
                    *operations += 1;
                    let left = Node::rotate_left(node.left.take().unwrap());
                    node.left = Some(left);
                    node.update_height();
                    return Some(Node::rotate_right(Box::new(node)));
                }

                // Right-Left case
                if balance < -1 && value < node.right.as_ref().unwrap().value {
                    *operations += 1;
                    let right = Node::rotate_right(node.right.take().unwrap());
                    node.right = Some(right);
                    node.update_height();
                    return Some(Node::rotate_left(Box::new(node)));
                }

                Some(Box::new(node))
            }

            fn search(node: &Option<Box<Node>>, value: usize, operations: &mut u64) -> bool {
                if let Some(n) = node {
                    *operations += 1;
                    if value == n.value {
                        return true;
                    } else if value < n.value {
                        return Self::search(&n.left, value, operations);
                    } else {
                        return Self::search(&n.right, value, operations);
                    }
                }
                false
            }

            fn inorder(node: &Option<Box<Node>>, result: &mut Vec<usize>, operations: &mut u64) {
                if let Some(n) = node {
                    Self::inorder(&n.left, result, operations);
                    result.push(n.value);
                    *operations += 1;
                    Self::inorder(&n.right, result, operations);
                }
            }
        }

        // ============================================================
        // ✅ Build AVL Tree from array
        // ============================================================
        let total_work = n * (n as f64).log2().ceil() as usize;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut root = None;

        // Insert all values
        for &value in &arr {
            root = Node::insert(root, value, &mut operations);
            work_done += 1;

            if sample && work_done % sample_interval == 0 {
                let progress = (work_done as f64 / n as f64 * 100.0).min(100.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        // Verify tree by inorder traversal (should be sorted)
        let mut sorted = Vec::new();
        Node::inorder(&root, &mut sorted, &mut operations);

        // Search for a value (median)
        let target = if n > 0 { arr[n / 2] } else { 0 };
        let found = Node::search(&root, target, &mut operations);

        // Final sample at 100%
        if sample {
            let last_sample = samples.last();
            if last_sample.is_none() || last_sample.unwrap().x < 99.9 {
                samples.push(MetricsPoint { 
                    x: 100.0, 
                    y: operations as f64 
                });
            } else if let Some(last) = samples.last_mut() {
                last.x = 100.0;
            }
        }

        let time_ms = start.elapsed().as_secs_f64() * 1000.0;

        // ============================================================
        // ✅ Debug: Log sampling info
        // ============================================================
        if sample {
            log_debug_fields!("avl_tree", "AVL Tree sampling completed", fields!(
                "array_size" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "found" => found,
                "tree_height" => Node::height(&root) as i64,
                "sorted" => is_sorted(&sorted),
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

fn is_sorted(arr: &[usize]) -> bool {
    arr.windows(2).all(|w| w[0] <= w[1])
}

#[cfg(test)]
impl AvlTree {
    /// Insert values and return sorted result (for testing)
    pub fn sort(&self, arr: &[usize]) -> Vec<usize> {
        let mut root = None;
        let mut ops = 0;

        for &value in arr {
            root = Node::insert(root, value, &mut ops);
        }

        let mut result = Vec::new();
        Node::inorder(&root, &mut result, &mut ops);
        result
    }

    /// Check if array is sorted (for testing)
    pub fn is_sorted(&self, arr: &[usize]) -> bool {
        is_sorted(arr)
    }

    /// Search for a value in AVL tree (for testing)
    pub fn search(&self, arr: &[usize], target: usize) -> bool {
        let mut root = None;
        let mut ops = 0;

        for &value in arr {
            root = Node::insert(root, value, &mut ops);
        }

        Node::search(&root, target, &mut ops)
    }
}

// Node struct for testing
#[derive(Clone)]
struct Node {
    value: usize,
    left: Option<Box<Node>>,
    right: Option<Box<Node>>,
    height: usize,
}

impl Node {
    fn new(value: usize) -> Self {
        Node {
            value,
            left: None,
            right: None,
            height: 1,
        }
    }

    fn height(node: &Option<Box<Node>>) -> usize {
        node.as_ref().map_or(0, |n| n.height)
    }

    fn balance_factor(node: &Option<Box<Node>>) -> isize {
        if let Some(n) = node {
            Self::height(&n.left) as isize - Self::height(&n.right) as isize
        } else {
            0
        }
    }

    fn update_height(&mut self) {
        self.height = 1 + std::cmp::max(
            Node::height(&self.left),
            Node::height(&self.right),
        );
    }

    fn rotate_right(mut node: Box<Node>) -> Box<Node> {
        let mut new_root = node.left.take().unwrap();
        node.left = new_root.right.take();
        node.update_height();
        new_root.right = Some(node);
        new_root.update_height();
        new_root
    }

    fn rotate_left(mut node: Box<Node>) -> Box<Node> {
        let mut new_root = node.right.take().unwrap();
        node.right = new_root.left.take();
        node.update_height();
        new_root.left = Some(node);
        new_root.update_height();
        new_root
    }

    fn insert(node: Option<Box<Node>>, value: usize, operations: &mut u64) -> Option<Box<Node>> {
        let mut node = if let Some(n) = node {
            *operations += 1;
            if value < n.value {
                let left = Self::insert(n.left, value, operations);
                Node {
                    left,
                    right: n.right,
                    value: n.value,
                    height: n.height,
                }
            } else if value > n.value {
                let right = Self::insert(n.right, value, operations);
                Node {
                    left: n.left,
                    right,
                    value: n.value,
                    height: n.height,
                }
            } else {
                return Some(n);
            }
        } else {
            *operations += 1;
            return Some(Box::new(Node::new(value)));
        };

        node.update_height();
        *operations += 1;

        let balance = Node::balance_factor(&Some(Box::new(node.clone())));

        if balance > 1 && value < node.left.as_ref().unwrap().value {
            *operations += 1;
            return Some(Node::rotate_right(Box::new(node)));
        }

        if balance < -1 && value > node.right.as_ref().unwrap().value {
            *operations += 1;
            return Some(Node::rotate_left(Box::new(node)));
        }

        if balance > 1 && value > node.left.as_ref().unwrap().value {
            *operations += 1;
            let left = Node::rotate_left(node.left.take().unwrap());
            node.left = Some(left);
            node.update_height();
            return Some(Node::rotate_right(Box::new(node)));
        }

        if balance < -1 && value < node.right.as_ref().unwrap().value {
            *operations += 1;
            let right = Node::rotate_right(node.right.take().unwrap());
            node.right = Some(right);
            node.update_height();
            return Some(Node::rotate_left(Box::new(node)));
        }

        Some(Box::new(node))
    }

    fn search(node: &Option<Box<Node>>, value: usize, operations: &mut u64) -> bool {
        if let Some(n) = node {
            *operations += 1;
            if value == n.value {
                return true;
            } else if value < n.value {
                return Self::search(&n.left, value, operations);
            } else {
                return Self::search(&n.right, value, operations);
            }
        }
        false
    }

    fn inorder(node: &Option<Box<Node>>, result: &mut Vec<usize>, operations: &mut u64) {
        if let Some(n) = node {
            Self::inorder(&n.left, result, operations);
            result.push(n.value);
            *operations += 1;
            Self::inorder(&n.right, result, operations);
        }
    }
}