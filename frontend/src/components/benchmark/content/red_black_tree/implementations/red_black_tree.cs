using System;
using System.Collections.Generic;

public class RedBlackTree
{
    private class Node
    {
        public int Key;
        public bool Color; // true = RED, false = BLACK
        public Node Left;
        public Node Right;
        public Node Parent;

        public Node(int key, bool color = true)
        {
            Key = key;
            Color = color;
            Left = null;
            Right = null;
            Parent = null;
        }
    }

    private Node root;
    private Node NIL;

    public RedBlackTree()
    {
        NIL = new Node(0, false);
        root = NIL;
    }

    private void LeftRotate(Node x)
    {
        Node y = x.Right;
        x.Right = y.Left;
        if (y.Left != NIL)
            y.Left.Parent = x;
        y.Parent = x.Parent;
        if (x.Parent == null)
            root = y;
        else if (x == x.Parent.Left)
            x.Parent.Left = y;
        else
            x.Parent.Right = y;
        y.Left = x;
        x.Parent = y;
    }

    private void RightRotate(Node x)
    {
        Node y = x.Left;
        x.Left = y.Right;
        if (y.Right != NIL)
            y.Right.Parent = x;
        y.Parent = x.Parent;
        if (x.Parent == null)
            root = y;
        else if (x == x.Parent.Right)
            x.Parent.Right = y;
        else
            x.Parent.Left = y;
        y.Right = x;
        x.Parent = y;
    }

    private void InsertFixup(Node z)
    {
        while (z.Parent != null && z.Parent.Color == true)
        {
            if (z.Parent == z.Parent.Parent.Left)
            {
                Node y = z.Parent.Parent.Right;
                if (y.Color == true)
                {
                    z.Parent.Color = false;
                    y.Color = false;
                    z.Parent.Parent.Color = true;
                    z = z.Parent.Parent;
                }
                else
                {
                    if (z == z.Parent.Right)
                    {
                        z = z.Parent;
                        LeftRotate(z);
                    }
                    z.Parent.Color = false;
                    z.Parent.Parent.Color = true;
                    RightRotate(z.Parent.Parent);
                }
            }
            else
            {
                Node y = z.Parent.Parent.Left;
                if (y.Color == true)
                {
                    z.Parent.Color = false;
                    y.Color = false;
                    z.Parent.Parent.Color = true;
                    z = z.Parent.Parent;
                }
                else
                {
                    if (z == z.Parent.Left)
                    {
                        z = z.Parent;
                        RightRotate(z);
                    }
                    z.Parent.Color = false;
                    z.Parent.Parent.Color = true;
                    LeftRotate(z.Parent.Parent);
                }
            }
        }
        root.Color = false;
    }

    private void Transplant(Node u, Node v)
    {
        if (u.Parent == null)
            root = v;
        else if (u == u.Parent.Left)
            u.Parent.Left = v;
        else
            u.Parent.Right = v;
        v.Parent = u.Parent;
    }

    private Node Minimum(Node node)
    {
        while (node.Left != NIL)
            node = node.Left;
        return node;
    }

    private void DeleteFixup(Node x)
    {
        while (x != root && x.Color == false)
        {
            if (x == x.Parent.Left)
            {
                Node w = x.Parent.Right;
                if (w.Color == true)
                {
                    w.Color = false;
                    x.Parent.Color = true;
                    LeftRotate(x.Parent);
                    w = x.Parent.Right;
                }
                if (w.Left.Color == false && w.Right.Color == false)
                {
                    w.Color = true;
                    x = x.Parent;
                }
                else
                {
                    if (w.Right.Color == false)
                    {
                        w.Left.Color = false;
                        w.Color = true;
                        RightRotate(w);
                        w = x.Parent.Right;
                    }
                    w.Color = x.Parent.Color;
                    x.Parent.Color = false;
                    w.Right.Color = false;
                    LeftRotate(x.Parent);
                    x = root;
                }
            }
            else
            {
                Node w = x.Parent.Left;
                if (w.Color == true)
                {
                    w.Color = false;
                    x.Parent.Color = true;
                    RightRotate(x.Parent);
                    w = x.Parent.Left;
                }
                if (w.Right.Color == false && w.Left.Color == false)
                {
                    w.Color = true;
                    x = x.Parent;
                }
                else
                {
                    if (w.Left.Color == false)
                    {
                        w.Right.Color = false;
                        w.Color = true;
                        LeftRotate(w);
                        w = x.Parent.Left;
                    }
                    w.Color = x.Parent.Color;
                    x.Parent.Color = false;
                    w.Left.Color = false;
                    RightRotate(x.Parent);
                    x = root;
                }
            }
        }
        x.Color = false;
    }

    private Node Search(Node node, int key)
    {
        if (node == NIL || key == node.Key)
            return node;
        if (key < node.Key)
            return Search(node.Left, key);
        return Search(node.Right, key);
    }

    private void Inorder(Node node, List<int> result)
    {
        if (node != NIL)
        {
            Inorder(node.Left, result);
            result.Add(node.Key);
            Inorder(node.Right, result);
        }
    }

    public void Insert(int key)
    {
        Node z = new Node(key);
        z.Left = NIL;
        z.Right = NIL;

        Node y = null;
        Node x = root;

        while (x != NIL)
        {
            y = x;
            if (z.Key < x.Key)
                x = x.Left;
            else
                x = x.Right;
        }

        z.Parent = y;
        if (y == null)
            root = z;
        else if (z.Key < y.Key)
            y.Left = z;
        else
            y.Right = z;

        InsertFixup(z);
    }

    public void Delete(int key)
    {
        Node z = Search(root, key);
        if (z == NIL) return;

        Node y = z;
        bool yOriginalColor = y.Color;
        Node x;

        if (z.Left == NIL)
        {
            x = z.Right;
            Transplant(z, z.Right);
        }
        else if (z.Right == NIL)
        {
            x = z.Left;
            Transplant(z, z.Left);
        }
        else
        {
            y = Minimum(z.Right);
            yOriginalColor = y.Color;
            x = y.Right;
            if (y.Parent == z)
            {
                x.Parent = y;
            }
            else
            {
                Transplant(y, y.Right);
                y.Right = z.Right;
                y.Right.Parent = y;
            }
            Transplant(z, y);
            y.Left = z.Left;
            y.Left.Parent = y;
            y.Color = z.Color;
        }

        if (yOriginalColor == false)
            DeleteFixup(x);
    }

    public bool Search(int key)
    {
        return Search(root, key) != NIL;
    }

    public List<int> Inorder()
    {
        List<int> result = new List<int>();
        Inorder(root, result);
        return result;
    }
}