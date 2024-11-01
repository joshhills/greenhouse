// Following this guide...
// https://dev.to/alexmercedcoder/understanding-rpc-tour-of-api-protocols-grpc-nodejs-walkthrough-and-apache-arrow-flight-55bd
// https://youtu.be/1dea_pZdhTg

// Load dependencies
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

// Path to our proto file
const PROTO_FILE = './service_def.proto'

// Options needed for loading Proto file
const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
}

// Load Proto File
const pkgDefs = protoLoader.loadSync(PROTO_FILE, options)
// Load Definition into gRPC
const profileServiceProto = grpc.loadPackageDefinition(pkgDefs)
// Create gRPC server
const server = new grpc.Server()

server.addService(profileServiceProto.ProfileService.service, {
    
    GetOrCreateProfile: (input, callback) => {
        // TODO
    }
})

server.bindAsync(
    '127.0.0.1:3003' // TODO: Load from 
)