use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct RedBlackTree;

impl AlgorithmRunner for RedBlackTree {
    fn aliases(&self) -> &'static [&'static str] {
        &["red-black-tree", "redblacktree", "rbt", "rb-tree"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        let arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        #[derive(Clone, Copy, PartialEq)]
        enum Color {
            Red,
            Black,
        }

        #[derive(Clone)]
        struct Node {
            value: usize,
            color: Color,
            left: Option<Box<Node>>,
            right: Option<Box<Node>>,
        }

        impl Node {
            fn new(value: usize) -> Self {
                Node {
                    value,
                    color: Color::Red,
                    left: None,
                    right: None,
                }
            }

            fn is_red(node: &Option<Box<Node>>) -> bool {
                node.as_ref().map_or(false, |n| n.color == Color::Red)
            }

            fn is_black(node: &Option<Box<Node>>) -> bool {
                !Self::is_red(node)
            }

            fn rotate_left(mut node: Box<Node>) -> Box<Node> {
                let mut new_root = node.right.take().unwrap();
                node.right = new_root.left.take();
                new_root.left = Some(node);
                new_root.color = Color::Red;
                if let Some(left) = &mut new_root.left {
                    left.color = Color::Black;
                }
                new_root
            }

            fn rotate_right(mut node: Box<Node>) -> Box<Node> {
                let mut new_root = node.left.take().unwrap();
                node.left = new_root.right.take();
                new_root.right = Some(node);
                new_root.color = Color::Red;
                if let Some(right) = &mut new_root.right {
                    right.color = Color::Black;
                }
                new_root
            }

            fn insert(node: Option<Box<Node>>, value: usize, operations: &mut u64) -> Option<Box<Node>> {
                let node = if let Some(n) = node {
                    *operations += 1;
                    if value < n.value {
                        let left = Self::insert(n.left, value, operations);
                        Node {
                            left,
                            right: n.right,
                            value: n.value,
                            color: n.color,
                        }
                    } else if value > n.value {
                        let right = Self::insert(n.right, value, operations);
                        Node {
                            left: n.left,
                            right,
                            value: n.value,
                            color: n.color,
                        }
                    } else {
                        return Some(n);
                    }
                } else {
                    *operations += 1;
                    return Some(Box::new(Node::new(value)));
                };

                let mut result = Self::fix_insert(Some(Box::new(node)), operations);
                if let Some(root) = &mut result {
                    root.color = Color::Black;
                    *operations += 1;
                }
                result
            }

            fn fix_insert(node: Option<Box<Node>>, operations: &mut u64) -> Option<Box<Node>> {
                let node_box = if let Some(n) = node { n } else { return None };

                if !Self::is_red(&node_box.left) && !Self::is_red(&node_box.right) {
                    return Some(node_box);
                }

                let mut n = node_box;

                if Self::is_red(&n.left) && Self::is_red(&n.left.as_ref().unwrap().left) {
                    *operations += 1;
                    let mut rotated = Self::rotate_right(n);
                    rotated.color = Color::Black;
                    if let Some(left) = &mut rotated.left {
                        left.color = Color::Red;
                    }
                    return Some(rotated);
                }

                if Self::is_red(&n.right) && Self::is_red(&n.right.as_ref().unwrap().right) {
                    *operations += 1;
                    let mut rotated = Self::rotate_left(n);
                    rotated.color = Color::Black;
                    if let Some(right) = &mut rotated.right {
                        right.color = Color::Red;
                    }
                    return Some(rotated);
                }

                if Self::is_red(&n.left) && Self::is_red(&n.left.as_ref().unwrap().right) {
                    *operations += 1;
                    let left = n.left.take().unwrap();
                    let rotated_left = Self::rotate_left(left);
                    n.left = Some(rotated_left);
                    let mut rotated = Self::rotate_right(n);
                    rotated.color = Color::Black;
                    if let Some(left) = &mut rotated.left {
                        left.color = Color::Red;
                    }
                    return Some(rotated);
                }

                if Self::is_red(&n.right) && Self::is_red(&n.right.as_ref().unwrap().left) {
                    *operations += 1;
                    let right = n.right.take().unwrap();
                    let rotated_right = Self::rotate_right(right);
                    n.right = Some(rotated_right);
                    let mut rotated = Self::rotate_left(n);
                    rotated.color = Color::Black;
                    if let Some(right) = &mut rotated.right {
                        right.color = Color::Red;
                    }
                    return Some(rotated);
                }

                Some(n)
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

            fn black_height(node: &Option<Box<Node>>) -> usize {
                if let Some(n) = node {
                    let left = Self::black_height(&n.left);
                    let right = Self::black_height(&n.right);
                    let add = if n.color == Color::Black { 1 } else { 0 };
                    add + std::cmp::max(left, right)
                } else {
                    0
                }
            }
        }

        let total_work = n * (n as f64).log2().ceil() as usize;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut root = None;

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

        let mut sorted = Vec::new();
        Node::inorder(&root, &mut sorted, &mut operations);

        let target = if n > 0 { arr[n / 2] } else { 0 };
        let found = Node::search(&root, target, &mut operations);

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

        if sample {
            log_debug_fields!("red_black_tree", "Red-Black Tree sampling completed", fields!(
                "array_size" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "found" => found,
                "black_height" => Node::black_height(&root) as i64,
                "sorted" => is_sorted(&sorted),
            ));
        }

        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

fn is_sorted(arr: &[usize]) -> bool {
    arr.windows(2).all(|w| w[0] <= w[1])
}

#[cfg(test)]
impl RedBlackTree {
    pub fn sort(&self, arr: &[usize]) -> Vec<usize> {
        let mut root = None;
        let mut ops = 0;

        for &value in arr {
            root = RbtNode::insert(root, value, &mut ops);
        }

        let mut result = Vec::new();
        RbtNode::inorder(&root, &mut result, &mut ops);
        result
    }

    pub fn is_sorted(&self, arr: &[usize]) -> bool {
        is_sorted(arr)
    }

    pub fn search(&self, arr: &[usize], target: usize) -> bool {
        let mut root = None;
        let mut ops = 0;

        for &value in arr {
            root = RbtNode::insert(root, value, &mut ops);
        }

        RbtNode::search(&root, target, &mut ops)
    }

    pub fn black_height(&self, arr: &[usize]) -> usize {
        let mut root = None;
        let mut ops = 0;

        for &value in arr {
            root = RbtNode::insert(root, value, &mut ops);
        }

        RbtNode::black_height(&root)
    }
}

#[cfg(test)]
#[derive(Clone, Copy, PartialEq)]
enum Color {
    Red,
    Black,
}

#[cfg(test)]
#[derive(Clone)]
struct RbtNode {
    value: usize,
    color: Color,
    left: Option<Box<RbtNode>>,
    right: Option<Box<RbtNode>>,
}

#[cfg(test)]
impl RbtNode {
    fn new(value: usize) -> Self {
        RbtNode {
            value,
            color: Color::Red,
            left: None,
            right: None,
        }
    }

    fn is_red(node: &Option<Box<RbtNode>>) -> bool {
        node.as_ref().map_or(false, |n| n.color == Color::Red)
    }

    fn rotate_left(mut node: Box<RbtNode>) -> Box<RbtNode> {
        let mut new_root = node.right.take().unwrap();
        node.right = new_root.left.take();
        new_root.left = Some(node);
        new_root.color = Color::Red;
        if let Some(left) = &mut new_root.left {
            left.color = Color::Black;
        }
        new_root
    }

    fn rotate_right(mut node: Box<RbtNode>) -> Box<RbtNode> {
        let mut new_root = node.left.take().unwrap();
        node.left = new_root.right.take();
        new_root.right = Some(node);
        new_root.color = Color::Red;
        if let Some(right) = &mut new_root.right {
            right.color = Color::Black;
        }
        new_root
    }

    fn insert(node: Option<Box<RbtNode>>, value: usize, operations: &mut u64) -> Option<Box<RbtNode>> {
        let node = if let Some(n) = node {
            *operations += 1;
            if value < n.value {
                let left = Self::insert(n.left, value, operations);
                RbtNode {
                    left,
                    right: n.right,
                    value: n.value,
                    color: n.color,
                }
            } else if value > n.value {
                let right = Self::insert(n.right, value, operations);
                RbtNode {
                    left: n.left,
                    right,
                    value: n.value,
                    color: n.color,
                }
            } else {
                return Some(n);
            }
        } else {
            *operations += 1;
            return Some(Box::new(RbtNode::new(value)));
        };

        let mut result = Self::fix_insert(Some(Box::new(node)), operations);
        if let Some(root) = &mut result {
            root.color = Color::Black;
            *operations += 1;
        }
        result
    }

    fn fix_insert(node: Option<Box<RbtNode>>, operations: &mut u64) -> Option<Box<RbtNode>> {
        let node_box = if let Some(n) = node { n } else { return None };
        if !Self::is_red(&node_box.left) && !Self::is_red(&node_box.right) {
            return Some(node_box);
        }
        let mut n = node_box;

        if Self::is_red(&n.left) && Self::is_red(&n.left.as_ref().unwrap().left) {
            *operations += 1;
            let mut rotated = Self::rotate_right(n);
            rotated.color = Color::Black;
            if let Some(left) = &mut rotated.left {
                left.color = Color::Red;
            }
            return Some(rotated);
        }
        if Self::is_red(&n.right) && Self::is_red(&n.right.as_ref().unwrap().right) {
            *operations += 1;
            let mut rotated = Self::rotate_left(n);
            rotated.color = Color::Black;
            if let Some(right) = &mut rotated.right {
                right.color = Color::Red;
            }
            return Some(rotated);
        }
        if Self::is_red(&n.left) && Self::is_red(&n.left.as_ref().unwrap().right) {
            *operations += 1;
            let left = n.left.take().unwrap();
            let rotated_left = Self::rotate_left(left);
            n.left = Some(rotated_left);
            let mut rotated = Self::rotate_right(n);
            rotated.color = Color::Black;
            if let Some(left) = &mut rotated.left {
                left.color = Color::Red;
            }
            return Some(rotated);
        }
        if Self::is_red(&n.right) && Self::is_red(&n.right.as_ref().unwrap().left) {
            *operations += 1;
            let right = n.right.take().unwrap();
            let rotated_right = Self::rotate_right(right);
            n.right = Some(rotated_right);
            let mut rotated = Self::rotate_left(n);
            rotated.color = Color::Black;
            if let Some(right) = &mut rotated.right {
                right.color = Color::Red;
            }
            return Some(rotated);
        }
        Some(n)
    }

    fn search(node: &Option<Box<RbtNode>>, value: usize, operations: &mut u64) -> bool {
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

    fn inorder(node: &Option<Box<RbtNode>>, result: &mut Vec<usize>, operations: &mut u64) {
        if let Some(n) = node {
            Self::inorder(&n.left, result, operations);
            result.push(n.value);
            *operations += 1;
            Self::inorder(&n.right, result, operations);
        }
    }

    fn black_height(node: &Option<Box<RbtNode>>) -> usize {
        if let Some(n) = node {
            let left = Self::black_height(&n.left);
            let right = Self::black_height(&n.right);
            let add = if n.color == Color::Black { 1 } else { 0 };
            add + std::cmp::max(left, right)
        } else {
            0
        }
    }
}