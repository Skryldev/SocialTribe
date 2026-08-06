using System;
using System.Collections.Generic;

public class AVLTree
{
    private class Node
    {
        public int Key;
        public Node Left;
        public Node Right;
        public int Height;

        public Node(int key)
        {
            Key = key;
            Height = 1;
        }
    }

    private Node root;

    private int Height(Node node)
    {
        return node == null ? 0 : node.Height;
    }

    private int Balance(Node node)
    {
        return node == null ? 0 : Height(node.Left) - Height(node.Right);
    }

    private void UpdateHeight(Node node)
    {
        node.Height = 1 + Math.Max(Height(node.Left), Height(node.Right));
    }

    private Node RotateRight(Node y)
    {
        Node x = y.Left;
        Node t2 = x.Right;
        x.Right = y;
        y.Left = t2;
        UpdateHeight(y);
        UpdateHeight(x);
        return x;
    }

    private Node RotateLeft(Node x)
    {
        Node y = x.Right;
        Node t2 = y.Left;
        y.Left = x;
        x.Right = t2;
        UpdateHeight(x);
        UpdateHeight(y);
        return y;
    }

    public void Insert(int key)
    {
        root = Insert(root, key);
    }

    private Node Insert(Node node, int key)
    {
        if (node == null)
            return new Node(key);

        if (key < node.Key)
            node.Left = Insert(node.Left, key);
        else if (key > node.Key)
            node.Right = Insert(node.Right, key);
        else
            return node;

        UpdateHeight(node);
        int balance = Balance(node);

        if (balance > 1 && key < node.Left.Key)
            return RotateRight(node);

        if (balance < -1 && key > node.Right.Key)
            return RotateLeft(node);

        if (balance > 1 && key > node.Left.Key)
        {
            node.Left = RotateLeft(node.Left);
            return RotateRight(node);
        }

        if (balance < -1 && key < node.Right.Key)
        {
            node.Right = RotateRight(node.Right);
            return RotateLeft(node);
        }

        return node;
    }

    public void Delete(int key)
    {
        root = Delete(root, key);
    }

    private Node Delete(Node node, int key)
    {
        if (node == null)
            return null;

        if (key < node.Key)
            node.Left = Delete(node.Left, key);
        else if (key > node.Key)
            node.Right = Delete(node.Right, key);
        else
        {
            if (node.Left == null)
                return node.Right;
            else if (node.Right == null)
                return node.Left;
            else
            {
                Node minNode = FindMin(node.Right);
                node.Key = minNode.Key;
                node.Right = Delete(node.Right, minNode.Key);
            }
        }

        UpdateHeight(node);
        int balance = Balance(node);

        if (balance > 1 && Balance(node.Left) >= 0)
            return RotateRight(node);

        if (balance > 1 && Balance(node.Left) < 0)
        {
            node.Left = RotateLeft(node.Left);
            return RotateRight(node);
        }

        if (balance < -1 && Balance(node.Right) <= 0)
            return RotateLeft(node);

        if (balance < -1 && Balance(node.Right) > 0)
        {
            node.Right = RotateRight(node.Right);
            return RotateLeft(node);
        }

        return node;
    }

    private Node FindMin(Node node)
    {
        Node current = node;
        while (current.Left != null)
            current = current.Left;
        return current;
    }

    public bool Search(int key)
    {
        return Search(root, key);
    }

    private bool Search(Node node, int key)
    {
        if (node == null)
            return false;
        if (key == node.Key)
            return true;
        if (key < node.Key)
            return Search(node.Left, key);
        return Search(node.Right, key);
    }

    public List<int> Inorder()
    {
        List<int> result = new List<int>();
        Inorder(root, result);
        return result;
    }

    private void Inorder(Node node, List<int> result)
    {
        if (node != null)
        {
            Inorder(node.Left, result);
            result.Add(node.Key);
            Inorder(node.Right, result);
        }
    }
}