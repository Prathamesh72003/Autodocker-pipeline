const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
const { Server } = require('socket.io')
const Redis = require('ioredis')
const cors = require('cors');

const app = express()
app.use(cors());
const PORT = 9000

const subscriber = new Redis('')

const io = new Server({ cors: '*' })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9002, () => console.log('Socket Server 9002'))

const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    }
})

const config = {
    CLUSTER: 'arn:aws:ecs:ap-south-1:961243822053:cluster/builder-cluster',
    TASK: 'arn:aws:ecs:ap-south-1:961243822053:task-definition/builder-task',
  };

app.use(express.json())

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body
    const projectSlug = slug ? slug : generateSlug()

    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: [
                    "subnet-01f76e6e5e9326eae",
                    "subnet-0fed81e27aefe8fd8",
                    "subnet-0ee9a61f614eed2c8",
                    "subnet-0761479d928a1e2e6",
                    "subnet-0b3ef4c7f0b8614a8",
                    "subnet-069c98b643ffafb05",
                  ],
                securityGroups: ["sg-0da9ca5398e85a072"],
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } })

})

async function initRedisSubscribe() {
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server Running..${PORT}`))