"use strict";
//#region 数据库初始化
//#tag 全局变量 - 所有帖子
let threadsStore = [];
//#endregion
//#region API
module.exports = function (app) {
    //#region api/threads/
    //#tag 发送主帖
    app.route("/api/threads/:board").post(async (req, res) => {
        try {
            console.log(req.params);
            const { board } = req.params;
            const { text, delete_password } = req.body;
            let _id = 1;

            // 找到主板，若主板存在则找到最大_id，不存在则_id依旧为1
            const existed_threads = threadsStore.filter((item) => item.board === board);
            if (existed_threads.length > 0) {
                const max_id = Math.max(...existed_threads.map((item) => item._id));
                _id = max_id + 1;
            }
            // 定义主帖并添加到数据库
            let thread = {
                _id,
                board,
                text,
                delete_password,
                reported: false,
                replies: [],
                replycount: 0,
                created_on: new Date(),
                bumped_on: new Date(),
            };
            threadsStore.push(thread);
            console.log(threadsStore);
            res.status(201).json(thread);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "创建主题失败" });
        }
    });
    //#tag 得到最新主帖群和回复群
    app.route("/api/threads/:board").get(async (req, res) => {
        try {
            console.log(req.params);
            const { board } = req.params;

            const threads = threadsStore
                .filter((item) => item.board === board)
                .sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on))
                .slice(0, 10);

            if (threads.length === 0) {
                return res.status(404).json({ error: "帖子未找到" });
            }

            const newest_10_threads = threads.map((item) => ({
                _id: item._id,
                board: item.board,
                text: item.text,
                replies: item.replies.slice(0, 3),
                replycount: item.replycount,
                created_on: item.created_on,
                bumped_on: item.bumped_on,
            }));

            res.status(201).json(newest_10_threads);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "得到帖子失败" });
        }
    });

    //#tag 删除主帖
    app.route("/api/threads/:board").delete(async (req, res) => {
        try {
            const { board } = req.params;
            const { thread_id, delete_password } = req.body;

            // 1.1 查找帖子
            const index = threadsStore.findIndex((item) => item.board === board && item._id === parseInt(thread_id));
            // 1.2 若帖子不存在，则报错返回
            if (index === -1) {
                return res.status(404).json({ error: "主帖不存在" });
            }

            // 2.1 校验密码是否正确，若不正确报错返回
            if (threadsStore[index].delete_password !== delete_password) {
                return res.status(403).json({ error: "密码不正确" });
            }

            // 2.2 若正确执行删除
            threadsStore.splice(index, 1);
            console.log(threadsStore);
            return res.status(204);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "删除主帖失败" });
        }
    });
    //#endregion
    //#region api/replies/
    //#tag 发送回帖
    app.route("/api/replies/:board").post(async (req, res) => {
        try {
            let _id = 1;
            const { board } = req.params;
            const { thread_id, text, delete_password } = req.body;

            // 找到主帖，若主帖不存在就报错
            const thread = threadsStore.find((item) => item.board === board && item._id === parseInt(thread_id));
            if (!thread) {
                return res.status(400).json({ error: "未找到对应的主帖" });
            }
            // 如果主帖存在回复，找到最大_id并+1
            else {
                const existed_replies = thread.replies;
                if (existed_replies.length > 0) {
                    const max_id = Math.max(...existed_replies.map((item) => item._id));
                    _id = max_id + 1;
                }
            }
            // 构造回复并推送到主题，然后更新主题
            let reply = {
                _id,
                text,
                delete_password,
                reported: false,
                created_on: new Date(),
                bumped_on: new Date(),
            };
            thread.bumped_on = new Date();
            thread.replies.push(reply);
            thread.replycount = thread.replies.length;
            // 测试和推送
            console.log(threadsStore);
            res.status(201).json(thread);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "创建回复失败" });
        }
    });
    //#tag 得到特定帖和剩余回复
    app.route("/api/replies/:board").get(async (req, res) => {
        try {
            console.log(req.params);
            console.log(req.query);

            console.log(req.body);
            const { board } = req.params;
            const { thread_id } = req.query;

            const thread = threadsStore.find((item) => item.board === board && item._id === parseInt(thread_id));

            if (!thread) {
                return res.status(404).json({ error: "主帖未找到" });
            }

            const filteredReplies = thread.replies
                .sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on))
                .slice(3);

            console.log(threadsStore);

            res.status(200).json({
                ...thread,
                replies: filteredReplies,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "得到剩余回复失败" });
        }
    });
    //#endregion
};
//#endregion
